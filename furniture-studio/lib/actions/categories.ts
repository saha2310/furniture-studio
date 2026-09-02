'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { categorySchema } from '@/lib/validations/work.schema';
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
