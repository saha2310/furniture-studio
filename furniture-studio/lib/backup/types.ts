// Формат manifest.json внутри бэкап-архива. См. lib/backup/README.md — это
// самодостаточный модуль, посторонний код на эти типы не завязан.
import { z } from 'zod';

export const BACKUP_FORMAT_VERSION = 1;

export type ImportMode = 'add' | 'replace';

const categoryBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number(),
  image_path: z.string().nullable(),
});

const workImageBackupSchema = z.object({
  id: z.string(),
  work_id: z.string(),
  storage_path: z.string(),
  alt_text: z.string().nullable(),
  sort_order: z.number(),
});

const workBackupSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  specs: z.record(z.string()).nullable(),
  cover_image_id: z.string().nullable(),
  is_featured: z.boolean(),
  sort_order: z.number(),
  status: z.enum(['draft', 'published']),
  images: z.array(workImageBackupSchema),
});

const contactLinkBackupSchema = z.object({
  id: z.string(),
  platform: z.string(),
  label: z.string(),
  url: z.string(),
  icon_key: z.string().nullable(),
  is_visible: z.boolean(),
  sort_order: z.number(),
});

const menuItemBackupSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  sort_order: z.number(),
  is_visible: z.boolean(),
});

const homeSectionBackupSchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  content_json: z.record(z.unknown()).nullable(),
  is_visible: z.boolean(),
  sort_order: z.number(),
});

const siteSettingsBackupSchema = z
  .object({
    id: z.number(),
    company_name: z.string().nullable(),
    logo_path: z.string().nullable(),
    favicon_path: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    seo_default_title: z.string().nullable(),
    seo_default_description: z.string().nullable(),
    og_image_path: z.string().nullable(),
  })
  .nullable();

export const backupManifestSchema = z.object({
  version: z.literal(BACKUP_FORMAT_VERSION),
  exported_at: z.string(),
  site_settings: siteSettingsBackupSchema,
  contact_links: z.array(contactLinkBackupSchema),
  menu_items: z.array(menuItemBackupSchema),
  home_sections: z.array(homeSectionBackupSchema),
  categories: z.array(categoryBackupSchema),
  works: z.array(workBackupSchema),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export interface ImportSummary {
  mode: ImportMode;
  categories: number;
  works: number;
  images: number;
  contactLinks: number;
  menuItems: number;
  homeSections: number;
  /** storage_path фото, файла которых не нашлось внутри архива — импорт всё равно продолжился. */
  skippedImages: string[];
}

/**
 * Единственное известное на сегодня место, где content_json секции главной
 * хранит путь к файлу — hero.imagePath (см. types/domain.ts → HeroContent).
 * Если в будущем другие секции тоже обзаведутся картинками — их нужно будет
 * добавить сюда явно, это не подхватится само (см. lib/backup/README.md).
 */
export function getSectionImagePath(contentJson: Record<string, unknown> | null): string | null {
  const value = contentJson?.imagePath;
  return typeof value === 'string' && value.length > 0 ? value : null;
}
