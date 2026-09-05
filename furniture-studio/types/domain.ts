import type { Database } from './database';

export type Category = Database['public']['Tables']['categories']['Row'];
export type WorkRow = Database['public']['Tables']['works']['Row'];
export type WorkImage = Database['public']['Tables']['work_images']['Row'];
export type SiteSettings = Database['public']['Tables']['site_settings']['Row'];
export type ContactLink = Database['public']['Tables']['contact_links']['Row'];
export type HomeSectionRow = Database['public']['Tables']['home_sections']['Row'];
export type ContactRequest = Database['public']['Tables']['contact_requests']['Row'];

// Work вместе со связанными данными — то, что реально используется в UI.
export interface WorkWithRelations extends WorkRow {
  category: Category;
  images: WorkImage[];
  coverImage: WorkImage | null;
}

// Публичный URL строится из storage_path в lib/utils/image.ts.
export interface WorkImageWithUrl extends WorkImage {
  url: string;
}

export interface WorkWithUrls extends Omit<WorkWithRelations, 'images' | 'coverImage'> {
  images: WorkImageWithUrl[];
  coverImage: WorkImageWithUrl | null;
}

// Известные ключи секций главной страницы. Каждая секция валидируется своей zod-схемой
// на основе этого ключа — см. lib/validations/home-section.schema.ts.
export type HomeSectionKey =
  | 'hero'
  | 'what_we_create'
  | 'featured_works'
  | 'process'
  | 'custom_made'
  | 'about_teaser'
  | 'contact_cta';

export interface HeroContent {
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imagePath: string | null;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface ProcessContent {
  steps: ProcessStep[];
}

export const KNOWN_CONTACT_PLATFORMS = [
  'telegram',
  'whatsapp',
  'vk',
  'instagram',
  'tiktok',
  'youtube',
  'phone',
  'email',
  'custom',
] as const;

export type ContactPlatform = (typeof KNOWN_CONTACT_PLATFORMS)[number];
