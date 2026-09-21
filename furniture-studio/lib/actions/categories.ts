'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { categorySchema } from '@/lib/validations/work.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';
import { getMediaAssetUsage } from './media';

async function validateImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Разрешены JPEG, PNG и WebP.';
  if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Файл превышает 4 МБ.';
  return null;
}

async function saveCategoryImage(supabase: Awaited<ReturnType<typeof createClient>>, categoryId: string, file: File): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const path = `categories/${categoryId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('works').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  return error ? { path: null, error: 'Не удалось загрузить изображение категории.' } : { path, error: null };
}

// Оригинал уже загружен браузером напрямую в Storage (см.
// SingleImageField.uploadOriginalDirect) — тут только читаем присланный путь.
// Если клиент не прислал его (например, загрузка оригинала не удалась —
// SingleImageField покажет об этом предупреждение), честно возвращаем null,
// а не подставляем что-то похожее на оригинал.
function readSubmittedOriginalPath(formData: FormData): string | null {
  const value = formData.get('category_image_original_path');
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export async function createCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const parsed = categorySchema.safeParse({ name: formData.get('name'), slug: formData.get('slug'), sort_order: formData.get('sort_order') || 0 });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const image = formData.get('category_image');
  const file = image instanceof File && image.size > 0 ? image : null;
  const imageError = await validateImage(file);
  if (imageError) return { success: false, message: imageError };

  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').insert(parsed.data).select('id').single();
  if (error || !data) {
    const message = error?.code === '23505' ? 'Категория с таким URL уже существует.' : actionError('Не удалось создать категорию.', error);
    return { success: false, message };
  }

  if (file) {
    const uploaded = await saveCategoryImage(supabase, data.id, file);
    if (uploaded.error || !uploaded.path) {
      await supabase.from('categories').delete().eq('id', data.id);
      return { success: false, message: uploaded.error ?? 'Не удалось сохранить изображение категории.' };
    }
    const originalPath = readSubmittedOriginalPath(formData);
    const { error: updateError } = await supabase.from('categories').update({ image_path: uploaded.path, image_original_path: originalPath }).eq('id', data.id);
    if (updateError) {
      await supabase.storage.from('works').remove([uploaded.path]);
      await supabase.from('categories').delete().eq('id', data.id);
      return { success: false, message: actionError('Не удалось сохранить изображение категории.', updateError) };
    }
  }

  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Категория создана', id: data.id };
}

export async function updateCategory(categoryId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const parsed = categorySchema.safeParse({ name: formData.get('name'), slug: formData.get('slug'), sort_order: formData.get('sort_order') || 0 });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const image = formData.get('category_image');
  const file = image instanceof File && image.size > 0 ? image : null;
  const imageError = await validateImage(file);
  if (imageError) return { success: false, message: imageError };

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from('categories').select('image_path, image_original_path').eq('id', categoryId).maybeSingle();
  if (currentError) return { success: false, message: actionError('Не удалось прочитать категорию.', currentError) };
  if (!current) return { success: false, message: 'Категория не найдена.' };

  const mediaPath = formData.get('category_image_media_path');
  const pickedFromLibrary = typeof mediaPath === 'string' && mediaPath.trim().length > 0;
  const submittedOriginalPath = readSubmittedOriginalPath(formData);

  let nextImagePath = current.image_path;
  let nextOriginalPath = current.image_original_path;
  let uploadedPath: string | null = null;
  if (file) {
    const uploaded = await saveCategoryImage(supabase, categoryId, file);
    if (uploaded.error || !uploaded.path) return { success: false, message: uploaded.error ?? 'Не удалось загрузить изображение.' };
    nextImagePath = uploaded.path;
    uploadedPath = uploaded.path;
    // Честно: если браузер не прислал оригинал (см. readSubmittedOriginalPath),
    // не выдумываем его — следующий кроп начнётся от только что загруженного
    // файла, что тоже правильно (это и есть исходник для нового файла).
    nextOriginalPath = submittedOriginalPath;
  } else if (pickedFromLibrary) {
    // Уже существующий файл, выбранный в медиатеке — без повторной загрузки.
    nextImagePath = mediaPath as string;
    // Без отдельного оригинала у файла из медиатеки используем тот же путь,
    // если только пользователь не обрезал картинку перед сохранением — тогда
    // submittedOriginalPath уже указывает на неё саму.
    nextOriginalPath = submittedOriginalPath ?? (mediaPath as string);
  } else if (formData.get('category_image_remove') === '1') {
    nextImagePath = null;
    nextOriginalPath = null;
  }

  const { error } = await supabase.from('categories').update({ ...parsed.data, image_path: nextImagePath, image_original_path: nextOriginalPath }).eq('id', categoryId);
  if (error) {
    if (uploadedPath) await supabase.storage.from('works').remove([uploadedPath]);
    const message = error.code === '23505' ? 'Категория с таким URL уже существует.' : actionError('Не удалось сохранить изменения.', error);
    return { success: false, message };
  }

  if (current.image_path && current.image_path !== nextImagePath && !pickedFromLibrary) {
    // Та же история, что и в lib/actions/works.ts / home-sections.ts:
    // изображение категории могло быть выбрано через «Открыть галерею» без
    // копирования и оказаться тем же физическим файлом, что и чья-то фотография
    // работы, логотип и т.п. Проверяем использование в других местах перед
    // безусловным удалением.
    const usage = await getMediaAssetUsage('works', current.image_path);
    if (!usage.used) await supabase.storage.from('works').remove([current.image_path]);
  }
  if (current.image_original_path && current.image_original_path !== nextOriginalPath && current.image_original_path !== current.image_path) {
    const usage = await getMediaAssetUsage('works', current.image_original_path);
    if (!usage.used) await supabase.storage.from('works').remove([current.image_original_path]);
  }
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Изменения сохранены' };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }
  const supabase = await createClient();
  const { count } = await supabase.from('works').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  if (count && count > 0) return { success: false, message: `Нельзя удалить: в категории ${count} работ(а). Сначала перенесите или удалите их.` };

  // Раньше здесь проверялась только основная категория (works.category_id).
  // Но категорию можно назначить работе и как ДОПОЛНИТЕЛЬНУЮ (work_categories,
  // on delete cascade) — без этой проверки категорию, использующуюся только
  // как дополнительная, можно было удалить, и у всех таких работ она молча
  // пропадала бы (каскадное удаление строк в work_categories), хотя диалог
  // подтверждения обещает «удалить можно только категорию без работ».
  const { count: extraCount, error: extraError } = await supabase
    .from('work_categories')
    .select('work_id', { count: 'exact', head: true })
    .eq('category_id', categoryId);
  if (extraError) {
    // Если таблицы ещё нет (миграция 0007 не применена) — не блокируем
    // удаление совсем, но оставляем след в логах, а не проглатываем молча.
    console.error('deleteCategory: work_categories query failed (миграция применена?)', extraError.message);
  } else if (extraCount && extraCount > 0) {
    return { success: false, message: `Нельзя удалить: категория используется как дополнительная у ${extraCount} работ(ы). Сначала уберите её там.` };
  }

  const { data: category } = await supabase.from('categories').select('image_path, image_original_path').eq('id', categoryId).maybeSingle();
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) return { success: false, message: actionError('Не удалось удалить категорию.', error) };
  if (category?.image_path) {
    // Строка categories уже удалена выше, так что getMediaAssetUsage здесь
    // корректно не увидит "используется этой же категорией" — только
    // сторонние ссылки (фото работы, логотип, секция главной).
    const usage = await getMediaAssetUsage('works', category.image_path);
    if (!usage.used) await supabase.storage.from('works').remove([category.image_path]);
  }
  if (category?.image_original_path && category.image_original_path !== category.image_path) {
    const usage = await getMediaAssetUsage('works', category.image_original_path);
    if (!usage.used) await supabase.storage.from('works').remove([category.image_original_path]);
  }
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Категория удалена' };
}
