import { z } from 'zod';
import { isValidSlug } from '@/lib/utils/slug';

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
  specs: z.record(z.string(), z.string()).optional(),
  is_featured: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
  status: z.enum(['draft', 'published']).default('published'),
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
