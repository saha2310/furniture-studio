// Часть модуля lib/backup/ — см. lib/backup/README.md, если задача не про бэкапы, сюда не нужно.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { BACKUP_FORMAT_VERSION, type BackupManifest } from './types';

/** Собирает manifest.json из текущего состояния БД. Файлы Storage сюда не входят — см. export.ts. */
export async function buildManifest(supabase: SupabaseClient<Database>): Promise<BackupManifest> {
  const [settingsRes, linksRes, menuRes, sectionsRes, categoriesRes, worksRes, imagesRes] = await Promise.all([
    supabase.from('site_settings').select('*').maybeSingle(),
    supabase.from('contact_links').select('*').order('sort_order'),
    supabase.from('site_menu_items').select('*').order('sort_order'),
    supabase.from('home_sections').select('*'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('works').select('*').order('sort_order'),
    supabase.from('work_images').select('*').order('sort_order'),
  ]);

  const failed = [
    ['site_settings', settingsRes.error],
    ['contact_links', linksRes.error],
    ['site_menu_items', menuRes.error],
    ['home_sections', sectionsRes.error],
    ['categories', categoriesRes.error],
    ['works', worksRes.error],
    ['work_images', imagesRes.error],
  ].find(([, error]) => error);
  if (failed) throw new Error(`Не удалось прочитать таблицу ${failed[0]} для бэкапа: ${(failed[1] as { message: string }).message}`);

  const images = imagesRes.data ?? [];
  const works = (worksRes.data ?? []).map((work) => ({
    ...work,
    images: images.filter((image) => image.work_id === work.id),
  }));

  return {
    version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    site_settings: settingsRes.data,
    contact_links: linksRes.data ?? [],
    menu_items: menuRes.data ?? [],
    home_sections: sectionsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    works,
  };
}
