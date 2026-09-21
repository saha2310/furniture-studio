'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { siteSettingsSchema, contactLinkSchema, menuItemSchema } from '@/lib/validations/settings.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';
import { getMediaAssetUsage } from './media';

// Если выбрана платформа «Телефон», а в поле «Ссылка» вписан просто номер без
// tel: — ссылка на сайте была бы битой (браузер попробует открыть как обычный
// адрес). Подстраховываемся на сервере, а не только подсказкой в форме.
function normalizeContactUrl(platform: string, url: string): string {
  if (platform !== 'phone') return url;
  const trimmed = url.trim();
  if (/^tel:/i.test(trimmed)) return trimmed;
  const digitsAndPlus = trimmed.replace(/[^0-9+]/g, '');
  return digitsAndPlus ? `tel:${digitsAndPlus}` : trimmed;
}

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

  // Несжатый оригинал этого же изображения — отдельная колонка (см.
  // 0010_image_originals.sql), нужна, чтобы повторное открытие редактора
  // кадрирования стартовало от исходника, а не от уже обрезанного
  // результата (см. lib/actions/../../components/admin/shared/SingleImageField.tsx).
  const originalField = `${field.replace(/_path$/, '')}_original_path` as 'logo_original_path' | 'favicon_original_path' | 'og_image_original_path';

  const fileValue = formData.get('file');
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (file && !ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, message: 'Неподдерживаемый формат. Разрешены JPEG, PNG, WebP.' };
  if (file && file.size > MAX_IMAGE_SIZE_BYTES) return { success: false, message: 'Файл превышает 4 МБ.' };

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from('site_settings').select(`${field}, ${originalField}`).eq('id', 1).maybeSingle();
  if (currentError) return { success: false, message: actionError('Не удалось прочитать текущую настройку.', currentError) };

  const record = current as Record<string, string | null> | null;
  const oldPath = record?.[field] ?? null;
  const oldOriginalPath = record?.[originalField] ?? null;
  let nextPath = oldPath;
  let nextOriginalPath = oldOriginalPath;
  let uploadedPath: string | null = null;

  const mediaPath = formData.get('file_media_path');
  const pickedFromLibrary = typeof mediaPath === 'string' && mediaPath.trim().length > 0;
  // Загружен браузером напрямую в Storage, в обход тела этого экшена — см.
  // SingleImageField.uploadOriginalDirect.
  const submittedOriginalPath = formData.get(`file_original_path`);

  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${field}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('site').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (uploadError) return { success: false, message: actionError('Не удалось загрузить изображение.', uploadError) };
    nextPath = path;
    uploadedPath = path;
    // Если клиент по какой-то причине не успел/не смог загрузить оригинал
    // (см. originalUploadError в SingleImageField), честно не выдумываем
    // его — nextOriginalPath останется null, а не будет указывать на чужой
    // файл.
    nextOriginalPath = typeof submittedOriginalPath === 'string' && submittedOriginalPath.trim().length > 0 ? submittedOriginalPath : null;
  } else if (pickedFromLibrary) {
    // Указывает на уже существующий файл в 'site' bucket — без повторной
    // загрузки. Старый файл ниже НЕ удаляем: он мог быть выбран из
    // медиатеки и использоваться где-то ещё, надёжно это знает только сама
    // медиатека (проверка перед её собственным удалением).
    nextPath = mediaPath as string;
    // У файла из медиатеки нет отдельного оригинала — используем тот же
    // путь (тот же компромисс, что и в WorkImageEditor.pickFromLibrary),
    // если только пользователь не обрезал его перед сохранением — тогда
    // submittedOriginalPath уже указывает именно на него.
    nextOriginalPath = typeof submittedOriginalPath === 'string' && submittedOriginalPath.trim().length > 0 ? submittedOriginalPath : (mediaPath as string);
  } else if (formData.get('file_remove') === '1') {
    nextPath = null;
    nextOriginalPath = null;
  }

  const { error: updateError } = await supabase.from('site_settings').update({ [field]: nextPath, [originalField]: nextOriginalPath }).eq('id', 1);
  if (updateError) {
    if (uploadedPath) await supabase.storage.from('site').remove([uploadedPath]);
    return { success: false, message: actionError('Не удалось сохранить настройку.', updateError) };
  }

  if (oldPath && oldPath !== nextPath && !pickedFromLibrary) {
    const usage = await getMediaAssetUsage('site', oldPath);
    if (!usage.used) await supabase.storage.from('site').remove([oldPath]);
  }
  if (oldOriginalPath && oldOriginalPath !== nextOriginalPath && oldOriginalPath !== oldPath) {
    // getMediaAssetUsage проверяет и *_original_path колонки (см. media.ts) —
    // не удаляем оригинал, если он всё ещё где-то используется как основной
    // путь (например, был выбран из медиатеки без отдельного оригинала).
    const usage = await getMediaAssetUsage('site', oldOriginalPath);
    if (!usage.used) await supabase.storage.from('site').remove([oldOriginalPath]);
  }
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
  const { error } = await supabase.from('contact_links').insert({ ...parsed.data, url: normalizeContactUrl(parsed.data.platform, parsed.data.url) });

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
  const { error } = await supabase.from('contact_links').update({ ...parsed.data, url: normalizeContactUrl(parsed.data.platform, parsed.data.url) }).eq('id', linkId);

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
