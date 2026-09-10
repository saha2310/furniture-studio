'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { categorySchema } from '@/lib/validations/work.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';

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
    const { error: updateError } = await supabase.from('categories').update({ image_path: uploaded.path }).eq('id', data.id);
    if (updateError) {
      await supabase.storage.from('works').remove([uploaded.path]);
      await supabase.from('categories').delete().eq('id', data.id);
      return { success: false, message: actionError('Не удалось сохранить изображение категории.', updateError) };
    }
  }

  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Категория создана' };
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
  const { data: current, error: currentError } = await supabase.from('categories').select('image_path').eq('id', categoryId).maybeSingle();
  if (currentError) return { success: false, message: actionError('Не удалось прочитать категорию.', currentError) };
  if (!current) return { success: false, message: 'Категория не найдена.' };

  let nextImagePath = current.image_path;
  let uploadedPath: string | null = null;
  if (file) {
    const uploaded = await saveCategoryImage(supabase, categoryId, file);
    if (uploaded.error || !uploaded.path) return { success: false, message: uploaded.error ?? 'Не удалось загрузить изображение.' };
    nextImagePath = uploaded.path;
    uploadedPath = uploaded.path;
  } else if (formData.get('category_image_remove') === '1') {
    nextImagePath = null;
  }

  const { error } = await supabase.from('categories').update({ ...parsed.data, image_path: nextImagePath }).eq('id', categoryId);
  if (error) {
    if (uploadedPath) await supabase.storage.from('works').remove([uploadedPath]);
    const message = error.code === '23505' ? 'Категория с таким URL уже существует.' : actionError('Не удалось сохранить изменения.', error);
    return { success: false, message };
  }

  if (current.image_path && current.image_path !== nextImagePath) await supabase.storage.from('works').remove([current.image_path]);
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Изменения сохранены' };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }
  const supabase = await createClient();
  const { count } = await supabase.from('works').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  if (count && count > 0) return { success: false, message: `Нельзя удалить: в категории ${count} работ(а). Сначала перенесите или удалите их.` };

  const { data: category } = await supabase.from('categories').select('image_path').eq('id', categoryId).maybeSingle();
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) return { success: false, message: actionError('Не удалось удалить категорию.', error) };
  if (category?.image_path) await supabase.storage.from('works').remove([category.image_path]);
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Категория удалена' };
}
