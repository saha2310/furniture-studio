'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { workImageUrl, siteAssetUrl } from '@/lib/utils/image';
import { getMediaAssetUsage } from './media';

/**
 * Одноразовая миграция уже загруженных PNG/JPEG/GIF/AVIF в WebP.
 *
 * Сознательно НЕ трогает site_settings.logo_path — по явной просьбе не
 * включать логотип в эту миграцию. Новые загрузки логотипа всё равно
 * конвертируются в WebP как любая другая загрузка (components/admin/shared/
 * SingleImageField.tsx), это касается только уже существующих файлов.
 *
 * Пиксели перекодируются в браузере (тот же canvas-путь, что и при обычной
 * загрузке — lib/utils/image-client.ts), а не на сервере: в проекте нет
 * серверной библиотеки для работы с изображениями (sharp и т.п.), а заводить
 * её только ради разовой миграции — лишняя тяжёлая зависимость. Эти экшены
 * только читают список кандидатов и применяют уже готовый результат
 * (обновляют ссылку в БД, удаляют старый файл) — см.
 * components/admin/backup/WebpMigrationPanel.tsx.
 */

export type MigrationBucket = 'works' | 'site';
export type MigrationKind =
  | 'work_image'
  | 'category'
  | 'site_favicon'
  | 'site_og'
  | 'home_section_hero'
  | 'home_section_contacts_gallery';

export interface MigrationCandidate {
  kind: MigrationKind;
  refId: string;
  bucket: MigrationBucket;
  path: string;
  url: string;
  label: string;
}

const NON_WEBP = /\.(png|jpe?g|gif|avif)$/i;

export async function listNonWebpAssets(): Promise<{ candidates: MigrationCandidate[]; error?: string }> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { candidates: [], error: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const candidates: MigrationCandidate[] = [];

  const { data: images } = await supabase.from('work_images').select('id, storage_path');
  for (const img of images ?? []) {
    if (NON_WEBP.test(img.storage_path)) {
      candidates.push({
        kind: 'work_image',
        refId: img.id,
        bucket: 'works',
        path: img.storage_path,
        url: workImageUrl(img.storage_path),
        label: `Фото товара (${img.storage_path})`,
      });
    }
  }

  const { data: categories } = await supabase.from('categories').select('id, name, image_path');
  for (const cat of categories ?? []) {
    if (cat.image_path && NON_WEBP.test(cat.image_path)) {
      candidates.push({
        kind: 'category',
        refId: cat.id,
        bucket: 'works',
        path: cat.image_path,
        url: workImageUrl(cat.image_path),
        label: `Обложка категории «${cat.name}»`,
      });
    }
  }

  // logo_path сознательно не читаем и не выбираем в кандидаты.
  const { data: settings } = await supabase
    .from('site_settings')
    .select('favicon_path, og_image_path')
    .eq('id', 1)
    .maybeSingle();
  if (settings?.favicon_path && NON_WEBP.test(settings.favicon_path)) {
    candidates.push({
      kind: 'site_favicon',
      refId: 'settings',
      bucket: 'site',
      path: settings.favicon_path,
      url: siteAssetUrl(settings.favicon_path),
      label: 'Иконка вкладки (favicon)',
    });
  }
  if (settings?.og_image_path && NON_WEBP.test(settings.og_image_path)) {
    candidates.push({
      kind: 'site_og',
      refId: 'settings',
      bucket: 'site',
      path: settings.og_image_path,
      url: siteAssetUrl(settings.og_image_path),
      label: 'OG-картинка превью',
    });
  }

  const { data: sections } = await supabase.from('home_sections').select('key, content_json');
  for (const section of sections ?? []) {
    const content = section.content_json as Record<string, unknown> | null;
    if (!content) continue;

    if (section.key === 'hero' && typeof content.imagePath === 'string' && NON_WEBP.test(content.imagePath)) {
      candidates.push({
        kind: 'home_section_hero',
        refId: 'hero',
        bucket: 'works',
        path: content.imagePath,
        url: workImageUrl(content.imagePath),
        label: 'Фон секции Hero',
      });
    }

    if (section.key === 'contacts_gallery' && Array.isArray(content.images)) {
      (content.images as unknown[]).forEach((item, index) => {
        if (item && typeof item === 'object' && 'path' in item && 'bucket' in item) {
          const { path, bucket } = item as { path: unknown; bucket: unknown };
          if (typeof path === 'string' && (bucket === 'works' || bucket === 'site') && NON_WEBP.test(path)) {
            candidates.push({
              kind: 'home_section_contacts_gallery',
              refId: `contacts_gallery:${index}`,
              bucket,
              path,
              url: bucket === 'works' ? workImageUrl(path) : siteAssetUrl(path),
              label: `Фото карусели контактов №${index + 1}`,
            });
          }
        }
      });
    }
  }

  return { candidates };
}

/**
 * Применяет результат миграции ОДНОГО файла: newPath уже загружен в тот же
 * бакет из браузера (см. WebpMigrationPanel.tsx). Эта функция только
 * переключает ссылку в БД на новый путь и удаляет старый файл — порядок тот
 * же, что и в syncWorkImages (lib/actions/works.ts): сначала обновляем
 * запись, только потом чистим Storage, чтобы при сбое максимум остался
 * лишний файл, а не битая ссылка.
 */
export async function applyWebpMigration(
  kind: MigrationKind,
  refId: string,
  oldPath: string,
  newPath: string,
  bucket: MigrationBucket
): Promise<{ success: boolean; message: string }> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  async function rollbackNewFile() {
    await supabase.storage.from(bucket).remove([newPath]);
  }

  if (kind === 'work_image') {
    const { error } = await supabase.from('work_images').update({ storage_path: newPath }).eq('id', refId);
    if (error) { await rollbackNewFile(); return { success: false, message: 'Не удалось обновить фото товара.' }; }
  } else if (kind === 'category') {
    const { error } = await supabase.from('categories').update({ image_path: newPath }).eq('id', refId);
    if (error) { await rollbackNewFile(); return { success: false, message: 'Не удалось обновить обложку категории.' }; }
  } else if (kind === 'site_favicon' || kind === 'site_og') {
    const field = kind === 'site_favicon' ? 'favicon_path' : 'og_image_path';
    const { error } = await supabase.from('site_settings').update({ [field]: newPath }).eq('id', 1);
    if (error) { await rollbackNewFile(); return { success: false, message: 'Не удалось обновить настройку сайта.' }; }
  } else if (kind === 'home_section_hero') {
    const { data: current, error: readError } = await supabase.from('home_sections').select('content_json').eq('key', 'hero').maybeSingle();
    if (readError || !current) { await rollbackNewFile(); return { success: false, message: 'Не удалось прочитать секцию Hero.' }; }
    const content = { ...(current.content_json as Record<string, unknown>), imagePath: newPath };
    const { error } = await supabase.from('home_sections').update({ content_json: content }).eq('key', 'hero');
    if (error) { await rollbackNewFile(); return { success: false, message: 'Не удалось сохранить секцию Hero.' }; }
  } else if (kind === 'home_section_contacts_gallery') {
    const index = Number(refId.split(':')[1]);
    const { data: current, error: readError } = await supabase.from('home_sections').select('content_json').eq('key', 'contacts_gallery').maybeSingle();
    if (readError || !current) { await rollbackNewFile(); return { success: false, message: 'Не удалось прочитать карусель контактов.' }; }
    const content = current.content_json as { images: { bucket: MigrationBucket; path: string }[] };
    if (!content.images?.[index] || content.images[index].path !== oldPath) {
      await rollbackNewFile();
      return { success: false, message: 'Изображение карусели уже изменилось — обновите список и попробуйте снова.' };
    }
    content.images[index] = { ...content.images[index], path: newPath };
    const { error } = await supabase.from('home_sections').update({ content_json: content }).eq('key', 'contacts_gallery');
    if (error) { await rollbackNewFile(); return { success: false, message: 'Не удалось сохранить карусель контактов.' }; }
  }

  // Эта функция переключает на newPath только ОДНУ конкретную ссылку
  // (kind+refId, обновлено выше). Если oldPath — тот же файл, что "одолжен"
  // ещё где-то (см. комментарий у removeUnusedStoragePaths в
  // lib/actions/works.ts), безусловное удаление сломало бы ту, другую
  // ссылку, которую эта миграция не трогала. К этому моменту ссылка,
  // которую мы обновляем, уже указывает на newPath, так что проверка
  // корректно увидит только СТОРОННИЕ упоминания oldPath.
  const usage = await getMediaAssetUsage(bucket, oldPath);
  if (!usage.used) {
    const { error: removeError } = await supabase.storage.from(bucket).remove([oldPath]);
    if (removeError) console.error('applyWebpMigration: failed to remove old file', removeError.message);
  }

  revalidatePath('/', 'layout');
  return { success: true, message: 'Переведено в WebP' };
}
