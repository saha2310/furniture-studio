import { z } from 'zod';
import { isValidSlug } from '@/lib/utils/slug';

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const workSchema = z.object({
  title: z.string().trim().min(2, 'Укажите название работы').max(120),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug слишком короткий')
    .max(120)
    .refine(isValidSlug, 'Slug может содержать только латиницу, цифры и дефисы'),
  category_id: z.string().uuid('Выберите категорию'),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  price: z.string().trim().max(120).optional().or(z.literal('')),
  specs: z.record(z.string(), z.string()).optional(),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  status: z.enum(['draft', 'published']).default('published'),
  // Цветовые варианты (см. supabase/migrations/0006_work_color_variants.sql).
  // group_id — если товар добавляется как ещё один цвет к уже существующему
  // товару; пустая строка/undefined = это новый товар (своя группа).
  color_name: z.string().trim().max(60).optional().or(z.literal('')),
  color_hex: z
    .string()
    .trim()
    .regex(HEX_COLOR_RE, 'Цвет должен быть в формате #RRGGBB')
    .optional()
    .or(z.literal('')),
  group_id: z.string().uuid().optional().or(z.literal('')),
  is_primary: z.boolean().default(false),
});

export type WorkFormValues = z.infer<typeof workSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Укажите название категории').max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .refine(isValidSlug, 'Slug может содержать только латиницу, цифры и дефисы'),
  sort_order: z.coerce.number().int().default(0),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
