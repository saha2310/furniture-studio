import { z } from 'zod';
import { KNOWN_CONTACT_PLATFORMS } from '@/types/domain';

/**
 * Общая проверка для полей-ссылок, которые заполняет только админ (меню,
 * способы связи), но которые рендерятся напрямую в href на публичном сайте.
 * Разрешаем: относительные пути ("/works"), протоколы http(s), а также
 * tel: и mailto: (нужны для номера телефона / email в способах связи).
 * Отсекаем javascript: и другие потенциально исполняемые схемы.
 */
const SAFE_HREF_PATTERN = /^(\/(?!\/)|https?:\/\/|tel:|mailto:)/i;

export function isSafeHref(value: string): boolean {
  return SAFE_HREF_PATTERN.test(value.trim());
}

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
  url: z
    .string()
    .trim()
    .min(1, 'Укажите ссылку')
    .max(300)
    .refine(isSafeHref, 'Ссылка должна начинаться с https://, tel:, mailto: или "/"'),
  is_visible: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export type ContactLinkFormValues = z.infer<typeof contactLinkSchema>;

export const menuItemSchema = z.object({
  label: z.string().trim().min(1, 'Укажите название').max(60),
  href: z
    .string()
    .trim()
    .min(1, 'Укажите адрес страницы')
    .max(200)
    .refine(isSafeHref, 'Адрес должен начинаться с https://, tel:, mailto: или "/"'),
  is_visible: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
