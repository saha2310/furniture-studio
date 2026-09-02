import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import type { ContactLink, SiteSettings } from '@/types/domain';

/**
 * Настройки сайта — единственный источник контактных данных и SEO-дефолтов.
 * Строка гарантированно одна (id = 1, see supabase/migrations/0001_init.sql).
 */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    console.error('getSiteSettings failed', error.message);
    return null;
  }
  return data;
}

/** Видимые способы связи, отсортированные для отображения в Header/Footer/ContactCTA. */
export async function getContactLinks(): Promise<ContactLink[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('contact_links')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getContactLinks failed', error.message);
    return [];
  }
  return data ?? [];
}

/** Все способы связи (включая скрытые) — для /admin/settings. */
export async function getAllContactLinksAdmin(): Promise<ContactLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_links')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getAllContactLinksAdmin failed', error.message);
    return [];
  }
  return data ?? [];
}


export async function getMenuItemsAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('site_menu_items').select('*').order('sort_order');
  if (error) { console.error('getMenuItemsAdmin failed', error.message); return []; }
  return data ?? [];
}

export async function getMenuItems() {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from('site_menu_items').select('*').eq('is_visible', true).order('sort_order');
  if (error) { console.error('getMenuItems failed', error.message); return []; }
  return data ?? [];
}
