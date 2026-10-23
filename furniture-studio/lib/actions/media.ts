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

/** Собирает все строковые "листья" произвольного JSON в один Set — используется
 * ниже вместо повторного обхода content_json на каждый файл медиатеки. */
function collectJsonStrings(node: unknown, out: Set<string>) {
  if (node == null) return;
  if (typeof node === 'string') { out.add(node); return; }
  if (Array.isArray(node)) { node.forEach((item) => collectJsonStrings(item, out)); return; }
  if (typeof node === 'object') { Object.values(node as Record<string, unknown>).forEach((item) => collectJsonStrings(item, out)); }
}

export interface MediaAssetWithUsage extends MediaAsset {
  used: boolean;
}

/**
 * Быстрая версия проверки использования для СПИСКА файлов сразу — в отличие
 * от getMediaAssetUsage (который делает несколько запросов НА ОДИН файл и
 * рассчитан на точечную проверку перед конкретным удалением), эта функция
 * один раз забирает все ссылающиеся на Storage колонки и home_sections, а
 * дальше сверяет пути в памяти. Для страницы "Медиатека", где нужно пометить
 * сразу все файлы бакета, это на порядки меньше запросов к БД, чем вызывать
 * getMediaAssetUsage в цикле по каждому файлу.
 *
 * Результат используется только для отображения (фильтр "неиспользуемые",
 * бейджи) — реальное удаление всё равно идёт через deleteMediaAsset, который
 * непосредственно перед удалением заново и точечно перепроверяет актуальное
 * состояние через getMediaAssetUsage. Так что устаревшие на секунду данные
 * здесь не риск: они не могут привести к удалению файла, который на самом
 * деле используется — только к неточной пометке в списке.
 */
export async function listMediaAssetsWithUsage(): Promise<{ assets: MediaAssetWithUsage[]; error?: string }> {
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
  const all = [...works, ...site];

  const [{ data: images }, { data: categories }, { data: settings }, { data: sections }] = await Promise.all([
    supabase.from('work_images').select('storage_path, original_path'),
    supabase.from('categories').select('image_path, image_original_path'),
    supabase.from('site_settings').select('logo_path, logo_original_path, favicon_path, favicon_original_path, og_image_path, og_image_original_path').maybeSingle(),
    supabase.from('home_sections').select('content_json'),
  ]);

  const usedWorksPaths = new Set<string>();
  for (const img of images ?? []) {
    if (img.storage_path) usedWorksPaths.add(img.storage_path);
    if (img.original_path) usedWorksPaths.add(img.original_path);
  }
  for (const cat of categories ?? []) {
    if (cat.image_path) usedWorksPaths.add(cat.image_path);
    if (cat.image_original_path) usedWorksPaths.add(cat.image_original_path);
  }

  const usedSitePaths = new Set<string>();
  if (settings) {
    for (const value of Object.values(settings)) {
      if (typeof value === 'string' && value) usedSitePaths.add(value);
    }
  }

  // content_json секций может ссылаться на файлы в любом из двух бакетов
  // (например, карусель контактов допускает и works, и site) — не различаем
  // бакет для этого источника, как и getMediaAssetUsage для одного файла.
  const usedAnyPaths = new Set<string>();
  for (const section of sections ?? []) collectJsonStrings(section.content_json, usedAnyPaths);

  return {
    assets: all.map((asset) => ({
      ...asset,
      used: asset.bucket === 'works'
        ? usedWorksPaths.has(asset.path) || usedAnyPaths.has(asset.path)
        : usedSitePaths.has(asset.path) || usedAnyPaths.has(asset.path),
    })),
  };
}

export async function getMediaAssetUsage(bucket: MediaBucket, path: string): Promise<{ used: boolean; locations: string[] }> {
  await requireUser().catch(() => null);
  const supabase = await createClient();
  const locations: string[] = [];

  if (bucket === 'works') {
    // storage_path — «рабочая» версия, original_path — несжатый исходник
    // (см. 0008_work_image_original.sql). Раньше тут проверялся только
    // storage_path: original_path-файл выглядел в Медиатеке "неиспользуемым"
    // и его можно было случайно удалить вручную, хотя редактор кадрирования
    // на него ссылается — тот же класс проблемы, что и у логотипа/категории
    // ниже, просто для фото работ уже существовавший.
    const { count: imageCount } = await supabase.from('work_images').select('id', { count: 'exact', head: true }).eq('storage_path', path);
    if (imageCount) locations.push(`фото работ (${imageCount})`);
    const { count: imageOriginalCount } = await supabase.from('work_images').select('id', { count: 'exact', head: true }).eq('original_path', path);
    if (imageOriginalCount) locations.push(`оригинал фото работ (${imageOriginalCount})`);

    const { count: categoryCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('image_path', path);
    if (categoryCount) locations.push('обложка категории');
    const { count: categoryOriginalCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('image_original_path', path);
    if (categoryOriginalCount) locations.push('оригинал обложки категории');
  }

  if (bucket === 'site') {
    const { data: settings } = await supabase
      .from('site_settings')
      .select('logo_path, logo_original_path, favicon_path, favicon_original_path, og_image_path, og_image_original_path')
      .maybeSingle();
    if (settings) {
      if (settings.logo_path === path) locations.push('логотип сайта');
      if (settings.logo_original_path === path) locations.push('оригинал логотипа сайта');
      if (settings.favicon_path === path) locations.push('favicon');
      if (settings.favicon_original_path === path) locations.push('оригинал favicon');
      if (settings.og_image_path === path) locations.push('OG-картинка');
      if (settings.og_image_original_path === path) locations.push('оригинал OG-картинки');
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
 * Копирует уже загруженное изображение (выбранное в медиатеке) в папку
 * работы на стороне Supabase Storage (.copy) — используется кнопкой
 * «Добавить из галереи» в редакторе фото работы.
 *
 * ВАЖНО: эта функция НЕ пишет ничего в work_images и не привязывает файл к
 * товару — только копирует байты в Storage и возвращает путь. Раньше она
 * сразу делала insert в work_images, из-за чего фото прикреплялось к
 * товару мгновенно по клику, в обход общей кнопки «Сохранить изменения»
 * внизу формы (и оставалось привязанным, даже если админ затем нажимал
 * «Отмена»). Теперь клиент (WorkImageEditor) добавляет скопированный путь
 * в тот же список "новых фотографий", что и обычная загрузка с диска —
 * реальная привязка к work_images происходит там же и тогда же, где и для
 * остальных фото: в syncWorkImages при сабмите формы.
 */
export async function copyMediaAssetFile(workId: string, sourcePath: string): Promise<{ success: boolean; message: string; path?: string }> {
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

  return { success: true, message: 'Фото скопировано', path: destPath };
}
