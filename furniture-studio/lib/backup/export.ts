// Часть модуля lib/backup/ — см. lib/backup/README.md, если задача не про бэкапы, сюда не нужно.
import 'server-only';
import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { buildManifest } from './manifest';
import { getSectionImagePath } from './types';

type Bucket = 'works' | 'site';

async function addStorageFile(zip: JSZip, supabase: SupabaseClient<Database>, bucket: Bucket, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    // Путь есть в БД, а файла в Storage уже нет — не валим весь экспорт из-за
    // одного пропавшего файла, просто не кладём его в архив.
    return;
  }
  zip.file(`images/${bucket}/${path}`, Buffer.from(await data.arrayBuffer()));
}

async function buildZip(supabase: SupabaseClient<Database>): Promise<JSZip> {
  const manifest = await buildManifest(supabase);
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const downloads: Promise<void>[] = [];

  for (const category of manifest.categories) {
    if (category.image_path) downloads.push(addStorageFile(zip, supabase, 'works', category.image_path));
  }
  for (const work of manifest.works) {
    for (const image of work.images) {
      downloads.push(addStorageFile(zip, supabase, 'works', image.storage_path));
    }
  }
  for (const section of manifest.home_sections) {
    const imagePath = getSectionImagePath(section.content_json);
    if (imagePath) downloads.push(addStorageFile(zip, supabase, 'works', imagePath));
  }
  if (manifest.site_settings) {
    const { logo_path, favicon_path, og_image_path } = manifest.site_settings;
    for (const path of [logo_path, favicon_path, og_image_path]) {
      if (path) downloads.push(addStorageFile(zip, supabase, 'site', path));
    }
  }

  await Promise.all(downloads);
  return zip;
}

/**
 * Буфер целиком в памяти — годится только для НЕбольших передач, где нужен
 * законченный Buffer (сейчас — вложение в письмо через Resend). Для скачивания
 * из браузера используй buildBackupZipStream — см. её комментарий, почему.
 */
export async function buildBackupZip(supabase: SupabaseClient<Database>): Promise<Buffer> {
  const zip = await buildZip(supabase);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/**
 * Стриминговая версия для ручного скачивания из админки.
 *
 * ВАЖНО: у serverless-функций Vercel жёсткий лимит в 4.5MB и на тело запроса,
 * И на тело ответа — его нельзя поднять никакой настройкой Next.js. Если бы
 * export/route.ts собирал zip в Buffer и отдавал его одним curl `new
 * NextResponse(buffer)`, при чуть более крупном каталоге (десяток-другой фото)
 * это на реальном Vercel вернуло бы 500 FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE.
 * Стриминг ответа выводит его из-под этого ограничения (см. lib/backup/README.md).
 */
export async function buildBackupZipStream(supabase: SupabaseClient<Database>) {
  const zip = await buildZip(supabase);
  return zip.generateNodeStream({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
