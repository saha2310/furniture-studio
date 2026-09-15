'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { workImageUrl, siteAssetUrl } from '@/lib/utils/image';
import { revalidatePath } from 'next/cache';

export type MediaBucket = 'works' | 'site';

export interface MediaAsset {
  bucket: MediaBucket;
  path: string;
  url: string;
  updatedAt: string | null;
  sizeBytes: number | null;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * Рекурсивно обходит бакет Storage (supabase.storage.list() отдаёт только один
 * уровень за раз — папки распознаются по id === null). Глубина ограничена 3
 * уровнями — с запасом под структуру путей проекта (`${workId}/file`,
 * `categories/file`), но защищает от случайного бесконечного обхода.
 */
async function listBucketRecursive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: MediaBucket,
  prefix = '',
  depth = 0,
): Promise<MediaAsset[]> {
  if (depth > 3) return [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });
  if (error || !data) return [];

  const results: MediaAsset[] = [];
  for (const entry of data) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const isFolder = entry.id === null;
    if (isFolder) {
      results.push(...(await listBucketRecursive(supabase, bucket, fullPath, depth + 1)));
      continue;
    }
    if (!IMAGE_EXT.test(entry.name)) continue;
    results.push({
      bucket,
      path: fullPath,
      url: bucket === 'works' ? workImageUrl(fullPath) : siteAssetUrl(fullPath),
      updatedAt: entry.updated_at ?? null,
      sizeBytes: entry.metadata?.size ?? null,
    });
  }
  return results;
}

export async function listMediaAssets(): Promise<{ assets: MediaAsset[]; error?: string }> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { assets: [], error: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const [works, site] = await Promise.all([
    listBucketRecursive(supabase, 'works'),
    listBucketRecursive(supabase, 'site'),
  ]);

  const all = [...works, ...site].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  return { assets: all };
}

/** Рекурсивный поиск точного значения строки где-либо внутри произвольного JSON. */
function jsonContainsValue(node: unknown, value: string): boolean {
  if (node == null) return false;
  if (typeof node === 'string') return node === value;
  if (Array.isArray(node)) return node.some((item) => jsonContainsValue(item, value));
  if (typeof node === 'object') return Object.values(node as Record<string, unknown>).some((item) => jsonContainsValue(item, value));
  return false;
}

export async function getMediaAssetUsage(bucket: MediaBucket, path: string): Promise<{ used: boolean; locations: string[] }> {
  await requireUser().catch(() => null);
  const supabase = await createClient();
  const locations: string[] = [];

  if (bucket === 'works') {
    const { count: imageCount } = await supabase.from('work_images').select('id', { count: 'exact', head: true }).eq('storage_path', path);
    if (imageCount) locations.push(`фото работ (${imageCount})`);

    const { count: categoryCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('image_path', path);
    if (categoryCount) locations.push('обложка категории');
  }

  if (bucket === 'site') {
    const { data: settings } = await supabase.from('site_settings').select('logo_path, favicon_path, og_image_path').maybeSingle();
    if (settings) {
      if (settings.logo_path === path) locations.push('логотип сайта');
      if (settings.favicon_path === path) locations.push('favicon');
      if (settings.og_image_path === path) locations.push('OG-картинка');
    }
  }

  // content_json секций главной/о нас — произвольная структура, ищем значение
  // строки где угодно внутри, независимо от типа секции.
  const { data: sections } = await supabase.from('home_sections').select('key, content_json');
  for (const section of sections ?? []) {
    if (jsonContainsValue(section.content_json, path)) {
      locations.push(`секция «${section.key}»`);
    }
  }

  return { used: locations.length > 0, locations };
}

export async function deleteMediaAsset(bucket: MediaBucket, path: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  // Перепроверяем на сервере перед удалением — не доверяем клиенту, даже если
  // он уже показывал предупреждение пользователю.
  const usage = await getMediaAssetUsage(bucket, path);
  if (usage.used) {
    return { success: false, message: `Файл используется: ${usage.locations.join(', ')}. Сначала уберите его оттуда.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return { success: false, message: 'Не удалось удалить файл: ' + error.message };

  revalidatePath('/', 'layout');
  return { success: true, message: 'Файл удалён' };
}

/**
 * Копирует уже загруженное изображение (выбранное в медиатеке) в конкретную
 * работу — используется кнопкой «Добавить из галереи» в редакторе фото
 * работы. Копирование идёт на стороне Supabase Storage (.copy), без
 * повторной передачи файла через браузер пользователя.
 */
export async function copyMediaAssetToWork(workId: string, sourcePath: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const ext = sourcePath.split('.').pop() ?? 'jpg';
  const destPath = `${workId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: copyError } = await supabase.storage.from('works').copy(sourcePath, destPath);
  if (copyError) return { success: false, message: 'Не удалось скопировать файл: ' + copyError.message };

  const { count } = await supabase.from('work_images').select('id', { count: 'exact', head: true }).eq('work_id', workId);
  const { error: insertError } = await supabase.from('work_images').insert({ work_id: workId, storage_path: destPath, sort_order: count ?? 0 });
  if (insertError) return { success: false, message: 'Файл скопирован, но не удалось привязать к работе: ' + insertError.message };

  revalidatePath(`/admin/works/${workId}`);
  return { success: true, message: 'Фото добавлено из медиатеки' };
}
