import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { workImageUrl } from '@/lib/utils/image';
import type { Category, WorkWithUrls } from '@/types/domain';

const WORK_SELECT = `
  *,
  category:categories(*),
  images:work_images!work_images_work_id_fkey(*)
`;

function attachUrls(row: any): WorkWithUrls {
  const images = (row.images ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((img: any) => ({ ...img, url: workImageUrl(img.storage_path) }));
  const coverImage =
    images.find((img: any) => img.id === row.cover_image_id) ?? images[0] ?? null;

  return { ...row, images, coverImage };
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) {
    console.error('getCategories failed', error.message);
    return [];
  }
  return data ?? [];
}

export async function getPublishedWorks(categorySlug?: string): Promise<WorkWithUrls[]> {
  const supabase = createStaticClient();
  let query = supabase
    .from('works')
    .select(WORK_SELECT)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (!category) return [];
    query = query.eq('category_id', category.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getPublishedWorks failed', error.message);
    return [];
  }
  return (data ?? []).map(attachUrls);
}

export async function getFeaturedWorks(limit = 3): Promise<WorkWithUrls[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('getFeaturedWorks failed', error.message);
    return [];
  }
  return (data ?? []).map(attachUrls);
}

export async function getWorkBySlug(slug: string): Promise<WorkWithUrls | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.error('getWorkBySlug failed', error.message);
    return null;
  }
  return data ? attachUrls(data) : null;
}

export async function getAllWorksAdmin(): Promise<WorkWithUrls[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getAllWorksAdmin failed', error.message);
    return [];
  }
  return (data ?? []).map(attachUrls);
}

export async function getWorkByIdAdmin(id: string): Promise<WorkWithUrls | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('works').select(WORK_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('getWorkByIdAdmin failed', error.message);
    return null;
  }
  return data ? attachUrls(data) : null;
}

export async function getAllWorkSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data } = await supabase.from('works').select('slug').eq('status', 'published');
  return (data ?? []).map((w) => w.slug);
}
