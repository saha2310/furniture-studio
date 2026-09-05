// Безопасный частичный импорт данных из JSON. В отличие от restoreFromZip('replace')
// этот модуль НИКОГДА не удаляет существующие записи.
import 'server-only';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const nullableString = z.string().nullable().optional();
const stringField = z.string().optional();

const categoryJsonSchema = z.object({
  id: stringField,
  slug: z.string(),
  name: stringField,
  sort_order: z.number().int().optional(),
  image_path: nullableString,
});

const workJsonSchema = z.object({
  id: stringField,
  slug: z.string(),
  category_id: stringField,
  category_slug: stringField,
  title: stringField,
  description: nullableString,
  price: nullableString,
  specs: z.record(z.string()).nullable().optional(),
  cover_image_id: nullableString,
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

const contactLinkJsonSchema = z.object({
  id: stringField,
  platform: stringField,
  label: stringField,
  url: stringField,
  icon_key: nullableString,
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const menuItemJsonSchema = z.object({
  id: stringField,
  label: stringField,
  href: stringField,
  sort_order: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

const homeSectionJsonSchema = z.object({
  id: stringField,
  key: z.string(),
  title: nullableString,
  subtitle: nullableString,
  content_json: z.record(z.unknown()).nullable().optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const siteSettingsJsonSchema = z.object({
  id: z.number().int().optional(),
  company_name: nullableString,
  logo_path: nullableString,
  favicon_path: nullableString,
  phone: nullableString,
  email: nullableString,
  address: nullableString,
  seo_default_title: nullableString,
  seo_default_description: nullableString,
  og_image_path: nullableString,
});

export const jsonImportSchema = z.object({
  categories: z.array(categoryJsonSchema).optional(),
  works: z.array(workJsonSchema).optional(),
  contact_links: z.array(contactLinkJsonSchema).optional(),
  menu_items: z.array(menuItemJsonSchema).optional(),
  home_sections: z.array(homeSectionJsonSchema).optional(),
  site_settings: siteSettingsJsonSchema.optional(),
}).refine((value) => Object.values(value).some((part) => part !== undefined), {
  message: 'JSON не содержит ни одного поддерживаемого раздела для импорта.',
});

export type JsonImportPayload = z.infer<typeof jsonImportSchema>;

export interface JsonImportSummary {
  categoriesCreated: number;
  categoriesUpdated: number;
  worksCreated: number;
  worksUpdated: number;
  contactLinksCreated: number;
  contactLinksUpdated: number;
  menuItemsCreated: number;
  menuItemsUpdated: number;
  homeSectionsCreated: number;
  homeSectionsUpdated: number;
  settingsUpdated: number;
}

function hasOwn<T extends object>(object: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function compactUpdate<T extends Record<string, unknown>>(source: T, allowed: readonly string[]) {
  return Object.fromEntries(
    allowed
      .filter((key) => hasOwn(source, key))
      .map((key): [string, unknown] => [key, source[key]]),
  );
}

function emptySummary(): JsonImportSummary {
  return {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    worksCreated: 0,
    worksUpdated: 0,
    contactLinksCreated: 0,
    contactLinksUpdated: 0,
    menuItemsCreated: 0,
    menuItemsUpdated: 0,
    homeSectionsCreated: 0,
    homeSectionsUpdated: 0,
    settingsUpdated: 0,
  };
}

function assertInsert<T>(data: T | null, error: { message: string } | null, message: string): T {
  if (error || !data) throw new Error(`${message}: ${error?.message ?? 'нет ответа от базы'}`);
  return data;
}

/**
 * Применяет JSON как upsert/patch:
 * - существующие записи ищутся по id, а если id не указан/не найден — по стабильному ключу;
 * - найденные записи обновляются только полями, присутствующими в JSON;
 * - отсутствующие записи создаются;
 * - записи, которых нет в JSON, не затрагиваются и не удаляются.
 */
export async function importFromJson(
  supabase: SupabaseClient<Database>,
  raw: unknown,
): Promise<JsonImportSummary> {
  const parsed = jsonImportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`JSON не прошёл проверку: ${issue?.path.join('.') || 'корень'} — ${issue?.message ?? 'неверный формат'}`);
  }

  const payload = parsed.data;
  const summary = emptySummary();
  const categoryIds = new Map<string, string>();

  // Сначала категории: новые works смогут сослаться на category_slug.
  for (const category of payload.categories ?? []) {
    let existing = null as { id: string } | null;
    if (category.id) {
      const result = await supabase.from('categories').select('id').eq('id', category.id).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти категорию: ${result.error.message}`);
      existing = result.data;
    }
    if (!existing) {
      const result = await supabase.from('categories').select('id').eq('slug', category.slug).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти категорию «${category.slug}»: ${result.error.message}`);
      existing = result.data;
    }

    if (existing) {
      const update = compactUpdate(category as Record<string, unknown>, ['name', 'slug', 'sort_order', 'image_path']);
      if (Object.keys(update).length) {
        const { error } = await supabase.from('categories').update(update).eq('id', existing.id);
        if (error) throw new Error(`Не удалось обновить категорию «${category.slug}»: ${error.message}`);
      }
      categoryIds.set(category.slug, existing.id);
      summary.categoriesUpdated += 1;
    } else {
      if (!category.name) throw new Error(`Новая категория «${category.slug}» должна содержать поле name.`);
      const created = await supabase
        .from('categories')
        .insert({
          id: category.id,
          name: category.name,
          slug: category.slug,
          sort_order: category.sort_order ?? 0,
          image_path: category.image_path ?? null,
        })
        .select('id')
        .single();
      const row = assertInsert(created.data, created.error, `Не удалось создать категорию «${category.slug}»`);
      categoryIds.set(category.slug, row.id);
      summary.categoriesCreated += 1;
    }
  }

  for (const work of payload.works ?? []) {
    let existing = null as { id: string; category_id: string } | null;
    if (work.id) {
      const result = await supabase.from('works').select('id, category_id').eq('id', work.id).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти работу «${work.slug}»: ${result.error.message}`);
      existing = result.data;
    }
    if (!existing) {
      const result = await supabase.from('works').select('id, category_id').eq('slug', work.slug).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти работу «${work.slug}»: ${result.error.message}`);
      existing = result.data;
    }

    let categoryId = work.category_id ?? (work.category_slug ? categoryIds.get(work.category_slug) : undefined);
    if (!categoryId && work.category_slug) {
      const categoryResult = await supabase.from('categories').select('id').eq('slug', work.category_slug).maybeSingle();
      if (categoryResult.error) throw new Error(`Не удалось найти категорию «${work.category_slug}»: ${categoryResult.error.message}`);
      categoryId = categoryResult.data?.id;
    }
    if (existing) {
      const update = compactUpdate(work as Record<string, unknown>, [
        'category_id', 'title', 'slug', 'description', 'price', 'specs', 'cover_image_id', 'is_featured', 'sort_order', 'status',
      ]);
      if (hasOwn(work, 'category_slug')) {
        if (!categoryId) throw new Error(`Для работы «${work.slug}» не найдена категория «${work.category_slug}».`);
        update.category_id = categoryId;
      }
      if (Object.keys(update).length) {
        const { error } = await supabase.from('works').update(update).eq('id', existing.id);
        if (error) throw new Error(`Не удалось обновить работу «${work.slug}»: ${error.message}`);
      }
      summary.worksUpdated += 1;
    } else {
      if (!work.title) throw new Error(`Новая работа «${work.slug}» должна содержать поле title.`);
      if (!categoryId) throw new Error(`Новая работа «${work.slug}» должна содержать category_id или category_slug существующей категории.`);
      const created = await supabase
        .from('works')
        .insert({
          id: work.id,
          category_id: categoryId,
          title: work.title,
          slug: work.slug,
          description: work.description ?? null,
          price: work.price ?? null,
          specs: work.specs ?? {},
          cover_image_id: work.cover_image_id ?? null,
          is_featured: work.is_featured ?? false,
          sort_order: work.sort_order ?? 0,
          status: work.status ?? 'draft',
        })
        .select('id')
        .single();
      assertInsert(created.data, created.error, `Не удалось создать работу «${work.slug}»`);
      summary.worksCreated += 1;
    }
  }

  for (const link of payload.contact_links ?? []) {
    let existing = null as { id: string } | null;
    if (link.id) {
      const result = await supabase.from('contact_links').select('id').eq('id', link.id).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти способ связи: ${result.error.message}`);
      existing = result.data;
    }
    if (!existing && link.platform) {
      const result = await supabase.from('contact_links').select('id').eq('platform', link.platform).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти способ связи «${link.platform}»: ${result.error.message}`);
      existing = result.data;
    }

    if (existing) {
      const update = compactUpdate(link as Record<string, unknown>, ['platform', 'label', 'url', 'icon_key', 'is_visible', 'sort_order']);
      if (Object.keys(update).length) {
        const { error } = await supabase.from('contact_links').update(update).eq('id', existing.id);
        if (error) throw new Error(`Не удалось обновить способ связи: ${error.message}`);
      }
      summary.contactLinksUpdated += 1;
    } else {
      if (!link.platform || !link.label || !link.url) throw new Error('Новый способ связи должен содержать platform, label и url.');
      const created = await supabase.from('contact_links').insert({
        id: link.id,
        platform: link.platform,
        label: link.label,
        url: link.url,
        icon_key: link.icon_key ?? null,
        is_visible: link.is_visible ?? true,
        sort_order: link.sort_order ?? 0,
      }).select('id').single();
      assertInsert(created.data, created.error, `Не удалось создать способ связи «${link.platform}»`);
      summary.contactLinksCreated += 1;
    }
  }

  for (const item of payload.menu_items ?? []) {
    let existing = null as { id: string } | null;
    if (item.id) {
      const result = await supabase.from('site_menu_items').select('id').eq('id', item.id).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти пункт меню: ${result.error.message}`);
      existing = result.data;
    }
    if (!existing) {
      const result = await supabase.from('site_menu_items').select('id').eq('href', item.href ?? '').maybeSingle();
      if (result.error) throw new Error(`Не удалось найти пункт меню «${item.href}»: ${result.error.message}`);
      existing = result.data;
    }

    if (existing) {
      const update = compactUpdate(item as Record<string, unknown>, ['label', 'href', 'sort_order', 'is_visible']);
      if (Object.keys(update).length) {
        const { error } = await supabase.from('site_menu_items').update(update).eq('id', existing.id);
        if (error) throw new Error(`Не удалось обновить пункт меню: ${error.message}`);
      }
      summary.menuItemsUpdated += 1;
    } else {
      if (!item.label || !item.href) throw new Error('Новый пункт меню должен содержать label и href.');
      const created = await supabase.from('site_menu_items').insert({
        id: item.id,
        label: item.label,
        href: item.href,
        sort_order: item.sort_order ?? 0,
        is_visible: item.is_visible ?? true,
      }).select('id').single();
      assertInsert(created.data, created.error, `Не удалось создать пункт меню «${item.href}»`);
      summary.menuItemsCreated += 1;
    }
  }

  for (const section of payload.home_sections ?? []) {
    let existing = null as { id: string } | null;
    if (section.id) {
      const result = await supabase.from('home_sections').select('id').eq('id', section.id).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти секцию «${section.key}»: ${result.error.message}`);
      existing = result.data;
    }
    if (!existing) {
      const result = await supabase.from('home_sections').select('id').eq('key', section.key).maybeSingle();
      if (result.error) throw new Error(`Не удалось найти секцию «${section.key}»: ${result.error.message}`);
      existing = result.data;
    }

    if (existing) {
      const update = compactUpdate(section as Record<string, unknown>, ['key', 'title', 'subtitle', 'content_json', 'is_visible', 'sort_order']);
      if (Object.keys(update).length) {
        const { error } = await supabase.from('home_sections').update(update).eq('id', existing.id);
        if (error) throw new Error(`Не удалось обновить секцию «${section.key}»: ${error.message}`);
      }
      summary.homeSectionsUpdated += 1;
    } else {
      const created = await supabase.from('home_sections').insert({
        id: section.id ?? randomUUID(),
        key: section.key,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
        content_json: section.content_json ?? {},
        is_visible: section.is_visible ?? true,
        sort_order: section.sort_order ?? 0,
      }).select('id').single();
      assertInsert(created.data, created.error, `Не удалось создать секцию «${section.key}»`);
      summary.homeSectionsCreated += 1;
    }
  }

  if (payload.site_settings) {
    const settings = payload.site_settings;
    const update = compactUpdate(settings as Record<string, unknown>, [
      'company_name', 'logo_path', 'favicon_path', 'phone', 'email', 'address', 'seo_default_title', 'seo_default_description', 'og_image_path',
    ]);
    if (Object.keys(update).length) {
      const id = settings.id ?? 1;
      const { data: existing, error: findError } = await supabase.from('site_settings').select('id').eq('id', id).maybeSingle();
      if (findError) throw new Error(`Не удалось прочитать настройки сайта: ${findError.message}`);
      if (existing) {
        const { error } = await supabase.from('site_settings').update(update).eq('id', id);
        if (error) throw new Error(`Не удалось обновить настройки сайта: ${error.message}`);
      } else {
        const { error } = await supabase.from('site_settings').insert({ id, ...update });
        if (error) throw new Error(`Не удалось создать настройки сайта: ${error.message}`);
      }
      summary.settingsUpdated = 1;
    }
  }

  return summary;
}

export function parseJsonImportText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Файл не читается как JSON. Проверьте синтаксис и сохраните файл в формате UTF-8.');
  }
}
