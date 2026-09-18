import { createClient } from '@/lib/supabase/server';
import { createStaticClient } from '@/lib/supabase/static';
import { requireUser } from '@/lib/actions/auth-guard';
import { workImageUrl } from '@/lib/utils/image';
import type { Category, WorkColorVariant, WorkWithUrls, WorkWithVariants } from '@/types/domain';

const WORK_SELECT = `
  *,
  category:categories!works_category_id_fkey(*),
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

function toColorVariant(work: WorkWithUrls): WorkColorVariant {
  return {
    id: work.id,
    slug: work.slug,
    colorName: work.color_name,
    colorHex: work.color_hex,
    isPrimary: work.is_primary,
    coverImage: work.coverImage,
  };
}

// Основной вариант всегда первый, дальше — по порядку сортировки товара.
function sortVariants(variants: WorkWithUrls[]): WorkWithUrls[] {
  return variants
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
}

// Группирует уже загруженный список публикаций по group_id и добавляет
// к каждой записи полный список цветовых вариантов группы (включая себя).
// Показываемый в карточке вариант: если передан colorHex — первый вариант
// этого цвета, иначе — is_primary (либо просто первый по sort_order).
function groupByColor(works: WorkWithUrls[], colorHex?: string): WorkWithVariants[] {
  const groups = new Map<string, WorkWithUrls[]>();
  for (const work of works) {
    const list = groups.get(work.group_id) ?? [];
    list.push(work);
    groups.set(work.group_id, list);
  }

  const entries: WorkWithVariants[] = [];
  for (const variants of groups.values()) {
    const sorted = sortVariants(variants);
    const matching = colorHex ? sorted.filter((v) => v.color_hex === colorHex) : sorted;
    if (colorHex && matching.length === 0) continue;
    const display = matching[0] ?? sorted[0];
    entries.push({ ...display, colorVariants: sorted.map(toColorVariant) });
  }

  return entries.sort((a, b) => a.sort_order - b.sort_order);
}

// Довешивает colorVariants к произвольному списку работ одним запросом —
// нужно везде, где карточка (WorkCard) должна показать свотчи, а исходная
// выборка (избранное, featured) не тянула соседей по группе сама.
async function attachColorVariantsBulk(
  supabase: ReturnType<typeof createStaticClient>,
  works: WorkWithUrls[],
): Promise<WorkWithVariants[]> {
  const groupIds = Array.from(new Set(works.map((w) => w.group_id)));
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .eq('status', 'published')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('attachColorVariantsBulk failed', error.message);
    return works.map((w) => ({ ...w, colorVariants: [toColorVariant(w)] }));
  }

  const byGroup = new Map<string, WorkWithUrls[]>();
  for (const sibling of (data ?? []).map(attachUrls)) {
    const list = byGroup.get(sibling.group_id) ?? [];
    list.push(sibling);
    byGroup.set(sibling.group_id, list);
  }

  return works.map((w) => ({
    ...w,
    colorVariants: sortVariants(byGroup.get(w.group_id) ?? [w]).map(toColorVariant),
  }));
}

// Строка .or()-фильтра supabase-js: товар подходит под категорию, если она
// у него основная (category_id) ИЛИ отмечена как дополнительная в
// work_categories (см. 0007_work_categories.sql). Нужна и на публичном
// сайте (каталог, доступные цвета), и в админке (кандидаты на привязку цвета).
async function categoryMembershipOrFilter(
  supabase: ReturnType<typeof createStaticClient> | Awaited<ReturnType<typeof createClient>>,
  categoryId: string,
): Promise<string> {
  const { data, error } = await supabase.from('work_categories').select('work_id').eq('category_id', categoryId);
  // Раньше ошибка здесь проглатывалась молча: если на конкретном
  // Supabase-проекте не накатана миграция с таблицей work_categories,
  // публичный каталог просто переставал учитывать "дополнительные
  // категории" товара без единого следа в логах — выглядело как забытая
  // фича, а не как несделанная миграция. Деградацию до фильтра по одной
  // основной категории оставляем (падать целиком из-за этого на публичном
  // сайте — хуже), но теперь хотя бы видно, в чём причина.
  if (error) {
    console.error('categoryMembershipOrFilter: work_categories query failed (миграция применена?)', error.message);
  }
  const workIds = Array.from(new Set((data ?? []).map((row) => row.work_id)));
  const parts = [`category_id.eq.${categoryId}`];
  if (workIds.length) parts.push(`id.in.(${workIds.join(',')})`);
  return parts.join(',');
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




export async function getPublishedWorksPage(
  categorySlug?: string,
  page = 1,
  pageSize = 8,
): Promise<{ works: WorkWithUrls[]; total: number; hasMore: boolean }> {
  const supabase = createStaticClient();
  let query = supabase
    .from('works')
    .select(WORK_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (!category) return { works: [], total: 0, hasMore: false };
    query = query.or(await categoryMembershipOrFilter(supabase, category.id));
  }

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) {
    console.error('getPublishedWorksPage failed', error.message);
    return { works: [], total: 0, hasMore: false };
  }
  const total = count ?? 0;
  return { works: (data ?? []).map(attachUrls), total, hasMore: from + (data?.length ?? 0) < total };
}

export async function getPublishedWorks(categorySlug?: string): Promise<WorkWithVariants[]> {
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
    query = query.or(await categoryMembershipOrFilter(supabase, category.id));
  }

  const { data, error } = await query;
  if (error) {
    console.error('getPublishedWorks failed', error.message);
    return [];
  }
  return attachColorVariantsBulk(supabase, (data ?? []).map(attachUrls));
}

// Для /works: одна карточка на товар (группу цветов), с фильтром по категории
// и по цвету (colorHex — если передан, оставляем только группы, где есть
// вариант этого цвета, и показываем именно его). Группировка происходит в
// памяти — каталог небольшой, отдельный RPC под это пока избыточен.
export async function getPublishedWorksPageGrouped(
  categorySlug?: string,
  colorHex?: string,
  page = 1,
  pageSize = 8,
): Promise<{ works: WorkWithVariants[]; total: number; hasMore: boolean }> {
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
    if (!category) return { works: [], total: 0, hasMore: false };
    query = query.or(await categoryMembershipOrFilter(supabase, category.id));
  }

  const { data, error } = await query;
  if (error) {
    console.error('getPublishedWorksPageGrouped failed', error.message);
    return { works: [], total: 0, hasMore: false };
  }

  const entries = groupByColor((data ?? []).map(attachUrls), colorHex);
  const total = entries.length;
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize;

  return { works: entries.slice(from, to), total, hasMore: to < total };
}

// Список цветов, доступных в текущей выборке (для фильтра на /works).
// Без учёта пагинации — фильтр должен показывать все цвета категории.
export async function getAvailableColors(categorySlug?: string): Promise<Array<{ name: string; hex: string }>> {
  const supabase = createStaticClient();
  let query = supabase.from('works').select('color_name, color_hex, category_id').eq('status', 'published');

  if (categorySlug) {
    const { data: category } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
    if (!category) return [];
    query = query.or(await categoryMembershipOrFilter(supabase, category.id));
  }

  const { data, error } = await query;
  if (error) {
    console.error('getAvailableColors failed', error.message);
    return [];
  }

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.color_hex && !seen.has(row.color_hex)) seen.set(row.color_hex, row.color_name ?? row.color_hex);
  }
  return Array.from(seen.entries()).map(([hex, name]) => ({ hex, name }));
}

export async function getFeaturedWorks(limit = 3): Promise<WorkWithVariants[]> {
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
  return attachColorVariantsBulk(supabase, (data ?? []).map(attachUrls));
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

// Для страницы товара: сам вариант + все остальные цвета той же группы —
// нужно, чтобы отрисовать переключатель цвета без второго похода на сервер.
export async function getWorkBySlugWithVariants(slug: string): Promise<WorkWithVariants | null> {
  const supabase = createStaticClient();
  const work = await getWorkBySlug(slug);
  if (!work) return null;

  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .eq('status', 'published')
    .eq('group_id', work.group_id)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getWorkBySlugWithVariants failed', error.message);
    return { ...work, colorVariants: [toColorVariant(work)] };
  }

  const siblings = (data ?? []).map(attachUrls);
  const sorted = sortVariants(siblings.length ? siblings : [work]);
  return { ...work, colorVariants: sorted.map(toColorVariant) };
}

export async function getAllWorksAdmin(): Promise<WorkWithUrls[]> {
  await requireUser();
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
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('works').select(WORK_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('getWorkByIdAdmin failed', error.message);
    return null;
  }
  return data ? attachUrls(data) : null;
}

// Для админки: все цветовые варианты товара (включая черновики) — рисуем
// вкладками над формой редактирования, чтобы переключаться между цветами
// одного товара. excludeId позволяет убрать из списка текущий редактируемый.
export async function getWorkGroupVariantsAdmin(groupId: string, excludeId?: string): Promise<WorkWithUrls[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from('works').select(WORK_SELECT).eq('group_id', groupId).order('sort_order', { ascending: true });
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) {
    console.error('getWorkGroupVariantsAdmin failed', error.message);
    return [];
  }
  return (data ?? []).map(attachUrls);
}

// Для «+ Существующий товар»: показываем все работы.
// Клиентский пикер фильтрует по названию, цвету и категориям, а финальная
// проверка допустимости привязки остаётся в attachWorkToGroup.
export async function getStandaloneWorksAdmin(workId: string): Promise<WorkWithUrls[]> {
  await requireUser();
  const supabase = await createClient();

  // Показываем все самостоятельные работы. Ограничение по пересечению
  // категорий остаётся на серверном attachWorkToGroup, а поиск в админке
  // теперь не скрывает потенциально нужный товар заранее.
  const { data, error } = await supabase
    .from('works')
    .select(WORK_SELECT)
    .neq('id', workId)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getStandaloneWorksAdmin failed', error.message);
    return [];
  }

  const works = (data ?? []).map(attachUrls);
  if (works.length === 0) return [];

  const { data: extraRows } = await supabase
    .from('work_categories')
    .select('work_id, category_id')
    .in('work_id', works.map((work) => work.id));
  const extraByWork = new Map<string, string[]>();
  for (const row of extraRows ?? []) {
    const list = extraByWork.get(row.work_id) ?? [];
    list.push(row.category_id);
    extraByWork.set(row.work_id, list);
  }
  return works.map((work) => ({ ...work, extraCategoryIds: extraByWork.get(work.id) ?? [] }));
}

// Id дополнительных категорий товара (без основной category_id) — для
// предзаполнения галочек в форме редактирования.
export async function getWorkExtraCategoryIds(workId: string): Promise<string[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('work_categories').select('category_id').eq('work_id', workId);
  if (error) {
    console.error('getWorkExtraCategoryIds failed', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.category_id);
}

// Цвета, уже использованные хоть в одном товаре (включая черновики — это
// админский список для быстрого выбора цвета) — чтобы не подбирать один и
// тот же оттенок заново вручную и не плодить слегка отличающиеся hex для
// визуально одного цвета в разных товарах.
export async function getUsedColorsAdmin(): Promise<Array<{ name: string; hex: string }>> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('works').select('color_name, color_hex').not('color_hex', 'is', null);
  if (error) {
    console.error('getUsedColorsAdmin failed', error.message);
    return [];
  }
  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.color_hex && !seen.has(row.color_hex)) seen.set(row.color_hex, row.color_name || row.color_hex);
  }
  return Array.from(seen.entries())
    .map(([hex, name]) => ({ hex, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export async function getAllWorkSlugs(): Promise<string[]> {
  const supabase = createStaticClient();
  const { data } = await supabase.from('works').select('slug').eq('status', 'published');
  return (data ?? []).map((w) => w.slug);
}
