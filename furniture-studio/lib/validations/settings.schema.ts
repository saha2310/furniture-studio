import { z } from 'zod';
import { KNOWN_CONTACT_PLATFORMS } from '@/types/domain';

export const siteSettingsSchema = z.object({
  company_name: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z.string().trim().email('Некорректный email').optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  seo_default_title: z.string().trim().max(120).optional().or(z.literal('')),
  seo_default_description: z.string().trim().max(300).optional().or(z.literal('')),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

export const contactLinkSchema = z.object({
  platform: z.enum(KNOWN_CONTACT_PLATFORMS),
  label: z.string().trim().min(1, 'Укажите название').max(60),
  url: z.string().trim().min(1, 'Укажите ссылку').max(300),
  is_visible: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export type ContactLinkFormValues = z.infer<typeof contactLinkSchema>;
