'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { categorySchema } from '@/lib/validations/work.schema';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';
import { slugify } from '@/lib/utils/slug';
import { getMediaAssetUsage } from './media';

// Админка категорий работает «без кнопки Сохранить»: каждое действие —
// создание, переименование, смена картинки, переключатель «На главной»,
// удаление — сразу пишется в БД отдельным экшеном (см.
// components/admin/categories/CategoriesManager.tsx). Поэтому здесь нет
// одной большой updateCategory(formData) (её больше нет): у каждого изменения своя маленькая
// мутация, которая не может случайно перезаписать соседние поля устаревшими
// значениями с клиента.

const DEFAULT_CATEGORY_NAME = 'Новая категория';
const DEFAULT_SUBCATEGORY_NAME = 'Новая подкатегория';

async function denyIfUnauthorized(): Promise<ActionResult | null> {
  try {
    await requireUser();
    return null;
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }
}

function revalidateCategoryPages() {
  revalidatePath('/admin/categories');
  revalidatePath('/works');
  revalidatePath('/');
}

// Создаёт категорию (parentId = null) или подкатегорию сразу в БД — с
// названием по умолчанию, которое админ тут же переименовывает в интерфейсе.
// Slug строится из названия; если он занят (у нескольких «Новых категорий»
// он один и тот же) — добавляется короткий случайный суффикс.
export async function createCategoryQuick(parentId: string | null): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;

  const supabase = await createClient();

  // Иерархия двухуровневая (см. 0011_category_subcategories.sql): подкатегория
  // сама не может быть родителем. Проверяем на сервере, а не только в UI.
  if (parentId) {
    const { data: parent, error: parentError } = await supabase.from('categories').select('parent_id').eq('id', parentId).maybeSingle();
    if (parentError) return { success: false, message: actionError('Не удалось найти родительскую категорию.', parentError) };
    if (!parent) return { success: false, message: 'Родительская категория не найдена.' };
    if (parent.parent_id) return { success: false, message: 'Подкатегория не может быть родителем — выберите категорию верхнего уровня.' };
  }

  const name = parentId ? DEFAULT_SUBCATEGORY_NAME : DEFAULT_CATEGORY_NAME;

  // Новая запись встаёт в конец списка среди «соседей» (та же родительская
  // категория или верхний уровень).
  const lastQuery = supabase.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const { data: last } = await (parentId ? lastQuery.eq('parent_id', parentId) : lastQuery.is('parent_id', null));
  const sortOrder = (last?.[0]?.sort_order ?? -1) + 1;

  const base = slugify(name) || 'category';
  const candidates = [base, ...Array.from({ length: 4 }, () => `${base}-${Math.random().toString(36).slice(2, 7)}`)];

  for (const slug of candidates) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        sort_order: sortOrder,
        parent_id: parentId,
        // Свежесозданная категория верхнего уровня — пустая заготовка с
        // названием «Новая категория»: не выводим её плиткой на главную,
        // пока админ сам не включит «На главной».
        ...(parentId ? {} : { show_on_home: false }),
      })
      .select('id')
      .single();

    if (!error && data) {
      revalidateCategoryPages();
      return { success: true, message: parentId ? 'Подкатегория добавлена' : 'Категория добавлена', id: data.id };
    }
    // 23505 — занят slug, пробуем со следующим суффиксом; остальное — ошибка.
    if (error?.code !== '23505') {
      return { success: false, message: actionError(parentId ? 'Не удалось добавить подкатегорию.' : 'Не удалось добавить категорию.', error) };
    }
  }
  return { success: false, message: 'Не удалось подобрать уникальный адрес страницы. Попробуйте ещё раз.' };
}

// Создание категории по готовым полям формы (название, slug, порядок,
// необязательный parent_id). Не используется самой страницей «Категории» —
// она создаёт заготовку через createCategoryQuick, — но нужна форме работы:
// оттуда категорию можно завести на лету, задав название сразу
// (components/admin/works/CategoriesPopover.tsx). Изображение здесь не
// принимается — его добавляют уже на странице «Категории».
export async function createCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    sort_order: formData.get('sort_order') || 0,
    parent_id: formData.get('parent_id'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const supabase = await createClient();

  // Иерархия двухуровневая: подкатегория сама не может стать родителем
  // (formData можно отправить и в обход формы, поэтому проверяем здесь).
  if (parsed.data.parent_id) {
    const { data: parent } = await supabase.from('categories').select('parent_id').eq('id', parsed.data.parent_id).maybeSingle();
    if (!parent) return { success: false, message: 'Родительская категория не найдена.' };
    if (parent.parent_id) return { success: false, message: 'Подкатегория не может быть родителем — выберите категорию верхнего уровня.' };
  }

  const { data, error } = await supabase.from('categories').insert(parsed.data).select('id').single();
  if (error || !data) {
    const message = error?.code === '23505' ? 'Категория с таким URL уже существует.' : actionError('Не удалось создать категорию.', error);
    return { success: false, message };
  }

  revalidateCategoryPages();
  return { success: true, message: 'Категория создана', id: data.id };
}

// Переименование. Slug (адрес /works?category=...) намеренно НЕ меняется:
// на него могут вести ссылки и закладки, а название — просто подпись.
export async function renameCategory(categoryId: string, name: string): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;

  const parsed = categorySchema.shape.name.safeParse(name);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте название.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').update({ name: parsed.data }).eq('id', categoryId).select('id');
  if (error) return { success: false, message: actionError('Не удалось сохранить название.', error) };
  if (!data || data.length === 0) return { success: false, message: 'Категория не найдена.' };

  revalidateCategoryPages();
  return { success: true, message: 'Название сохранено' };
}

function isSafeStoragePath(path: string) {
  return path.length > 0 && path.length <= 300 && !path.startsWith('/') && !path.includes('..') && !/[\u0000-\u001f\\]/.test(path);
}

// Сохраняет ссылку на изображение категории (и на его несжатый оригинал для
// повторного кадрирования, см. 0010_image_originals.sql). Сами файлы к этому
// моменту уже лежат в Storage: браузер грузит их туда напрямую (см.
// components/admin/categories/CategoryImageControl.tsx), а в Server Action
// едут только пути — так тяжёлые файлы не упираются в лимит тела запроса
// Vercel (см. комментарий у MAX_IMAGE_SIZE_BYTES в lib/utils/image.ts).
//
//   imagePath = null      — удалить изображение;
//   fromLibrary = true    — файл выбран из медиатеки, предыдущий файл из
//                           Storage не удаляем (он остаётся в медиатеке).
//
// Изображение есть только у категорий верхнего уровня: у подкатегории оно
// нигде не используется, поэтому для неё экшен отказывает.
export async function setCategoryImage(
  categoryId: string,
  input: { imagePath: string | null; originalPath: string | null; fromLibrary?: boolean },
): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;

  const nextImage = input.imagePath;
  const nextOriginal = nextImage ? input.originalPath : null;
  if (nextImage && !isSafeStoragePath(nextImage)) return { success: false, message: 'Некорректный путь к изображению.' };
  if (nextOriginal && !isSafeStoragePath(nextOriginal)) return { success: false, message: 'Некорректный путь к оригиналу изображения.' };

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from('categories')
    .select('parent_id, image_path, image_original_path')
    .eq('id', categoryId)
    .maybeSingle();
  if (currentError) return { success: false, message: actionError('Не удалось прочитать категорию.', currentError) };
  if (!current) return { success: false, message: 'Категория не найдена.' };
  if (current.parent_id) return { success: false, message: 'У подкатегории нет изображения — оно нужно только категориям верхнего уровня.' };

  const { error } = await supabase
    .from('categories')
    .update({ image_path: nextImage, image_original_path: nextOriginal })
    .eq('id', categoryId);
  if (error) return { success: false, message: actionError('Не удалось сохранить изображение.', error) };

  // Прежние файлы удаляем из Storage только если ими больше ничего не
  // пользуется: изображение могло быть выбрано из медиатеки «как есть» и
  // оказаться тем же физическим файлом, что и чья-то фотография работы,
  // логотип и т.п. (см. getMediaAssetUsage).
  if (current.image_path && current.image_path !== nextImage && !input.fromLibrary) {
    const usage = await getMediaAssetUsage('works', current.image_path);
    if (!usage.used) await supabase.storage.from('works').remove([current.image_path]);
  }
  if (current.image_original_path && current.image_original_path !== nextOriginal && current.image_original_path !== current.image_path) {
    const usage = await getMediaAssetUsage('works', current.image_original_path);
    if (!usage.used) await supabase.storage.from('works').remove([current.image_original_path]);
  }

  revalidateCategoryPages();
  return { success: true, message: nextImage ? 'Изображение сохранено' : 'Изображение удалено' };
}

// Отдельное лёгкое действие для переключателя «На главной» — мгновенная
// мутация одного поля, по тому же принципу, что toggleWorkStatus() у работ.
export async function toggleCategoryShowOnHome(categoryId: string, next: boolean): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.from('categories').update({ show_on_home: next }).eq('id', categoryId);
  if (error) return { success: false, message: actionError('Не удалось изменить видимость на главной.', error) };
  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { success: true, message: next ? 'Показывается на главной' : 'Скрыта с главной' };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const denied = await denyIfUnauthorized();
  if (denied) return denied;
  const supabase = await createClient();

  const { count: childCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', categoryId);
  if (childCount && childCount > 0) return { success: false, message: `Нельзя удалить: у категории есть ${childCount} подкатегори${childCount === 1 ? 'я' : 'и'}. Сначала удалите их или перенесите в другой раздел.` };

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
  revalidateCategoryPages();
  return { success: true, message: 'Категория удалена' };
}
