'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { siteSettingsSchema, contactLinkSchema } from '@/lib/validations/settings.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';

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
    return { success: false, message: 'Не удалось сохранить настройки' };
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Настройки сохранены' };
}

export async function uploadSiteAsset(
  field: 'logo_path' | 'favicon_path' | 'og_image_path',
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Выберите файл' };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, message: 'Неподдерживаемый формат. Разрешены JPEG, PNG, WebP.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { success: false, message: 'Файл превышает 8 МБ.' };
  }

  const supabase = await createClient();
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${field}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('site').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) {
    console.error('uploadSiteAsset failed', uploadError.message);
    return { success: false, message: 'Не удалось загрузить файл' };
  }

  const { data: current } = await supabase.from('site_settings').select(field).eq('id', 1).maybeSingle();
  const oldPath = (current as Record<string, string | null> | null)?.[field];

  const { error: updateError } = await supabase.from('site_settings').update({ [field]: path }).eq('id', 1);
  if (updateError) {
    console.error('uploadSiteAsset: settings update failed', updateError.message);
    return { success: false, message: 'Файл загружен, но не удалось обновить настройки' };
  }

  if (oldPath) {
    await supabase.storage.from('site').remove([oldPath]);
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Файл загружен' };
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
    return { success: false, message: 'Не удалось добавить способ связи' };
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
    return { success: false, message: 'Не удалось сохранить изменения' };
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
    return { success: false, message: 'Не удалось удалить' };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  return { success: true, message: 'Способ связи удалён' };
}
