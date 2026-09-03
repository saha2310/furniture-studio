import { createClient } from '@/lib/supabase/server';
import type { HomeSectionRow, HomeSectionKey } from '@/types/domain';

export async function getHomeSections(): Promise<HomeSectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getHomeSections failed', error.message);
    return [];
  }
  return data ?? [];
}

export function findSection(sections: HomeSectionRow[], key: HomeSectionKey | (string & {})): HomeSectionRow | undefined {
  return sections.find((s) => s.key === key);
}
