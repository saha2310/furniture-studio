'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { siteSettingsSchema, contactLinkSchema, menuItemSchema } from '@/lib/validations/settings.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';

export async function updateSiteSettings(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = siteSettingsSchema.safeParse({
    company_name: formData.get('company_name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    seo_default_title: formData.get('seo_default_title'),
    seo_default_description: formData.get('seo_default_description'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('site_settings').update(parsed.data).eq('id', 1);

  if (error) {
    console.error('updateSiteSettings failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить настройки.', error) };
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Настройки сохранены' };
}

export async function saveSiteAsset(
  field: 'logo_path' | 'favicon_path' | 'og_image_path',
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const fileValue = formData.get('file');
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (file && !ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, message: 'Неподдерживаемый формат. Разрешены JPEG, PNG, WebP.' };
  if (file && file.size > MAX_IMAGE_SIZE_BYTES) return { success: false, message: 'Файл превышает 4 МБ.' };

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from('site_settings').select(field).eq('id', 1).maybeSingle();
  if (currentError) return { success: false, message: actionError('Не удалось прочитать текущую настройку.', currentError) };

  const oldPath = (current as Record<string, string | null> | null)?.[field] ?? null;
  let nextPath = oldPath;
  let uploadedPath: string | null = null;

  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${field}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('site').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (uploadError) return { success: false, message: actionError('Не удалось загрузить изображение.', uploadError) };
    nextPath = path;
    uploadedPath = path;
  } else if (formData.get('file_remove') === '1') {
    nextPath = null;
  }

  const { error: updateError } = await supabase.from('site_settings').update({ [field]: nextPath }).eq('id', 1);
  if (updateError) {
    if (uploadedPath) await supabase.storage.from('site').remove([uploadedPath]);
    return { success: false, message: actionError('Не удалось сохранить настройку.', updateError) };
  }

  if (oldPath && oldPath !== nextPath) await supabase.storage.from('site').remove([oldPath]);
  revalidatePath('/', 'layout'); revalidatePath('/admin/settings');
  return { success: true, message: file ? 'Изображение сохранено' : nextPath ? 'Настройка сохранена' : 'Изображение удалено' };
}


// --- contact_links -----------------------------------------------------------

export async function createContactLink(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = contactLinkSchema.safeParse({
    platform: formData.get('platform'),
    label: formData.get('label'),
    url: formData.get('url'),
    is_visible: formData.get('is_visible') === 'on',
    sort_order: formData.get('sort_order') || 0,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_links').insert(parsed.data);

  if (error) {
    console.error('createContactLink failed', error.message);
    return { success: false, message: actionError('Не удалось добавить способ связи.', error) };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { success: true, message: 'Способ связи добавлен' };
}

export async function updateContactLink(
  linkId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = contactLinkSchema.safeParse({
    platform: formData.get('platform'),
    label: formData.get('label'),
    url: formData.get('url'),
    is_visible: formData.get('is_visible') === 'on',
    sort_order: formData.get('sort_order') || 0,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_links').update(parsed.data).eq('id', linkId);

  if (error) {
    console.error('updateContactLink failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить изменения.', error) };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { success: true, message: 'Изменения сохранены' };
}

export async function deleteContactLink(linkId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_links').delete().eq('id', linkId);

  if (error) {
    console.error('deleteContactLink failed', error.message);
    return { success: false, message: actionError('Не удалось удалить способ связи.', error) };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { success: true, message: 'Способ связи удалён' };
}


export async function createMenuItem(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const parsed = menuItemSchema.safeParse({
    label: formData.get('label'),
    href: formData.get('href'),
    sort_order: formData.get('sort_order') || 0,
    is_visible: formData.get('is_visible') === 'on',
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const supabase = await createClient();
  const { error } = await supabase.from('site_menu_items').insert(parsed.data);
  if (error) return { success: false, message: actionError('Не удалось добавить пункт меню.', error) };
  revalidatePath('/', 'layout'); revalidatePath('/admin/settings');
  return { success: true, message: 'Пункт меню добавлен' };
}

export async function updateMenuItem(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const parsed = menuItemSchema.safeParse({
    label: formData.get('label'),
    href: formData.get('href'),
    sort_order: formData.get('sort_order') || 0,
    is_visible: formData.get('is_visible') === 'on',
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const supabase = await createClient();
  const { error } = await supabase.from('site_menu_items').update(parsed.data).eq('id', id);
  if (error) return { success: false, message: actionError('Не удалось сохранить пункт меню.', error) };
  revalidatePath('/', 'layout'); revalidatePath('/admin/settings');
  return { success: true, message: 'Пункт меню сохранён' };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }
  const supabase = await createClient();
  const { error } = await supabase.from('site_menu_items').delete().eq('id', id);
  if (error) return { success: false, message: actionError('Не удалось удалить пункт меню.', error) };
  revalidatePath('/', 'layout'); revalidatePath('/admin/settings');
  return { success: true, message: 'Пункт меню удалён' };
}
