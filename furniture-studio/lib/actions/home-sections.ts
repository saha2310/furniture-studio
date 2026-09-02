'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { heroContentSchema, processContentSchema } from '@/lib/validations/home-section.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';

/** Обновление title/subtitle/is_visible для любой секции по ключу — общая часть для всех типов. */
export async function updateSectionMeta(
  key: string,
  data: { title?: string; subtitle?: string; is_visible: boolean }
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('home_sections')
    .update({ title: data.title || null, subtitle: data.subtitle || null, is_visible: data.is_visible })
    .eq('key', key);

  if (error) {
    console.error('updateSectionMeta failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить секцию.', error) };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/home');
  return { success: true, message: 'Секция обновлена' };
}

export async function updateHeroSection(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try { await requireUser(); } catch (e) { if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' }; throw e; }

  const parsed = heroContentSchema.safeParse({
    title: formData.get('title'), description: formData.get('description'),
    primaryCtaLabel: formData.get('primaryCtaLabel'), primaryCtaHref: formData.get('primaryCtaHref'),
    secondaryCtaLabel: formData.get('secondaryCtaLabel'), secondaryCtaHref: formData.get('secondaryCtaHref'),
    imagePath: null,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase.from('home_sections').select('content_json').eq('key', 'hero').maybeSingle();
  if (currentError) return { success: false, message: 'Не удалось прочитать текущий Hero.' };
  const currentPath = (current?.content_json as { imagePath?: string | null } | null)?.imagePath ?? null;
  const file = formData.get('image');
  let imagePath = currentPath;
  let uploadedPath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, message: 'Разрешены JPEG, PNG и WebP.' };
    if (file.size > MAX_IMAGE_SIZE_BYTES) return { success: false, message: 'Файл превышает 8 МБ.' };
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from('works').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (error) return { success: false, message: 'Не удалось загрузить изображение Hero.' };
    imagePath = path; uploadedPath = path;
  } else if (formData.get('image_remove') === '1') imagePath = null;

  const nextContent = { ...parsed.data, imagePath };
  const { error } = await supabase.from('home_sections').update({ content_json: nextContent, is_visible: formData.get('is_visible') === 'on' }).eq('key', 'hero');
  if (error) {
    if (uploadedPath) await supabase.storage.from('works').remove([uploadedPath]);
    return { success: false, message: actionError('Не удалось сохранить Hero-секцию.', error) };
  }
  if (currentPath && currentPath !== imagePath) await supabase.storage.from('works').remove([currentPath]);

  revalidatePath('/', 'layout'); revalidatePath('/admin/home');
  return { success: true, message: 'Hero-секция сохранена' };
}

export async function updateProcessSection(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const titles = formData.getAll('step_title');
  const descriptions = formData.getAll('step_description');
  const steps = titles
    .map((title, i) => ({ title: String(title).trim(), description: String(descriptions[i] ?? '').trim() }))
    .filter((s) => s.title);

  const parsed = processContentSchema.safeParse({ steps });
  if (!parsed.success) {
    return { success: false, message: 'Добавьте хотя бы один шаг с названием' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('home_sections')
    .update({ content_json: parsed.data, is_visible: formData.get('is_visible') === 'on' })
    .eq('key', 'process');

  if (error) {
    console.error('updateProcessSection failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить секцию процесса.', error) };
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Секция обновлена' };
}

/** Обновление секции about_page (используется /admin/about и /about). */
export async function updateAboutPage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const title = String(formData.get('title') ?? '').trim();
  const subtitle = String(formData.get('subtitle') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from('home_sections')
    .update({ title: title || null, subtitle: subtitle || null, content_json: { body } })
    .eq('key', 'about_page');

  if (error) {
    console.error('updateAboutPage failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить страницу.', error) };
  }

  revalidatePath('/about');
  return { success: true, message: 'Страница «О мастерской» обновлена' };
}
