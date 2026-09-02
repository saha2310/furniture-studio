'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { categorySchema } from '@/lib/validations/work.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';

export async function createCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    sort_order: formData.get('sort_order') || 0,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('categories').insert(parsed.data);

  if (error) {
    console.error('createCategory failed', error.message);
    const message = error.code === '23505' ? 'Категория с таким slug уже существует' : 'Не удалось создать категорию';
    return { success: false, message };
  }

  revalidatePath('/admin/categories');
  revalidatePath('/works');
  revalidatePath('/');
  return { success: true, message: 'Категория создана' };
}

export async function updateCategory(
  categoryId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    sort_order: formData.get('sort_order') || 0,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('categories').update(parsed.data).eq('id', categoryId);

  if (error) {
    console.error('updateCategory failed', error.message);
    const message = error.code === '23505' ? 'Категория с таким slug уже существует' : 'Не удалось сохранить изменения';
    return { success: false, message };
  }

  revalidatePath('/admin/categories');
  revalidatePath('/works');
  revalidatePath('/');
  return { success: true, message: 'Изменения сохранены' };
}

export async function uploadCategoryImage(categoryId: string, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { success: false, message: 'Выберите изображение' };
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, message: 'Разрешены JPEG, PNG и WebP.' };
  if (file.size > MAX_IMAGE_SIZE_BYTES) return { success: false, message: 'Файл превышает 8 МБ.' };
  const supabase = await createClient();
  const { data: current } = await supabase.from('categories').select('image_path').eq('id', categoryId).maybeSingle();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `categories/${categoryId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('works').upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { success: false, message: 'Не удалось загрузить изображение' };
  const { error } = await supabase.from('categories').update({ image_path: path }).eq('id', categoryId);
  if (error) { await supabase.storage.from('works').remove([path]); return { success: false, message: 'Не удалось сохранить изображение' }; }
  if (current?.image_path) await supabase.storage.from('works').remove([current.image_path]);
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Изображение категории обновлено' };
}

export async function deleteCategoryImage(categoryId: string): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }
  const supabase = await createClient();
  const { data: current } = await supabase.from('categories').select('image_path').eq('id', categoryId).maybeSingle();
  if (current?.image_path) await supabase.storage.from('works').remove([current.image_path]);
  const { error } = await supabase.from('categories').update({ image_path: null }).eq('id', categoryId);
  if (error) return { success: false, message: 'Не удалось удалить изображение' };
  revalidatePath('/admin/categories'); revalidatePath('/works'); revalidatePath('/');
  return { success: true, message: 'Изображение удалено' };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from('works')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (count && count > 0) {
    return {
      success: false,
      message: `Нельзя удалить: в категории ${count} работ(а). Сначала перенесите или удалите их.`,
    };
  }

  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) {
    console.error('deleteCategory failed', error.message);
    return { success: false, message: 'Не удалось удалить категорию' };
  }

  revalidatePath('/admin/categories');
  revalidatePath('/works');
  revalidatePath('/');
  return { success: true, message: 'Категория удалена' };
}
