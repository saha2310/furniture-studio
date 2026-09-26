import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/actions/auth-guard';
import { WORK_SELECT, attachUrls } from './works';
import type { Category, WorkWithUrls } from '@/types/domain';

// Запросы для обзорной страницы админки (app/admin/(dashboard)/page.tsx).
// Отдельный файл, а не works.ts/site.ts — это данные не про один домен
// (работы/категории), а про сводку по всем сразу, и нужны только на одной
// странице.

export interface DashboardCounts {
  published: number;
  drafts: number;
  categories: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  await requireUser();
  const supabase = await createClient();

  const [published, drafts, categories] = await Promise.all([
    supabase.from('works').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('works').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);

  return {
    published: published.count ?? 0,
    drafts: drafts.count ?? 0,
    categories: categories.count ?? 0,
  };
}

// Последние работы вперемешку со всеми статусами (и опубликованные, и
// черновики) — сортировка по updated_at, а не created_at, чтобы в списке
// сразу было видно и недавно добавленное, и недавно отредактированное.
// Бейдж статуса на самой карточке уже показывает, черновик это или нет —
// отдельный фильтр тут не нужен (так и попросили: "покахывай не давние 5
// работ или измененные и черновеки тожн").
export async function getRecentWorksAdmin(limit = 5): Promise<WorkWithUrls[]> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentWorksAdmin failed', error.message);
    return [];
  }

  return (data ?? []).map(attachUrls);
}

export interface CategoryWorkCount {
  id: string;
  name: string;
  slug: string;
  count: number;
}

// Считаем работы по категориям ВЕРХНЕГО уровня для прогресс-баров на
// дашборде. Работа, у которой category_id указывает на подкатегорию,
// засчитывается в бар родителя — иначе строка родительской категории всегда
// показывала бы 0, хотя у неё есть товары через подкатегории (см.
// 0011_category_subcategories.sql). Supabase JS не даёт сделать group by
// через .select(), поэтому тянем category_id всех работ одним запросом и
// считаем в JS — тот же приём, что и в getAllWorksAdmin (works.ts) для
// work_categories.
//
// Намеренно считаем ВСЕ работы (и опубликованные, и черновики) — это
// сводка по контенту в системе, а не только по тому, что видно на сайте.
export async function getCategoryWorkCounts(): Promise<CategoryWorkCount[]> {
  await requireUser();
  const supabase = await createClient();

  const [{ data: categories, error: catError }, { data: works, error: worksError }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('works').select('category_id'),
  ]);

  if (catError || worksError || !categories) {
    console.error('getCategoryWorkCounts failed', catError?.message ?? worksError?.message);
    return [];
  }

  const parentOf = new Map<string, string>();
  for (const row of categories as Category[]) {
    if (row.parent_id) parentOf.set(row.id, row.parent_id);
  }

  const countByTopId = new Map<string, number>();
  for (const work of (works ?? []) as Array<{ category_id: string }>) {
    const topId = parentOf.get(work.category_id) ?? work.category_id;
    countByTopId.set(topId, (countByTopId.get(topId) ?? 0) + 1);
  }

  return (categories as Category[])
    .filter((row) => !row.parent_id)
    .map((row) => ({ id: row.id, name: row.name, slug: row.slug, count: countByTopId.get(row.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}
