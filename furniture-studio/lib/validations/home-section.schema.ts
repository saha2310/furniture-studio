import { z } from 'zod';

export const heroContentSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(500),
  primaryCtaLabel: z.string().trim().min(1).max(60),
  primaryCtaHref: z.string().trim().min(1).max(200),
  secondaryCtaLabel: z.string().trim().min(1).max(60),
  secondaryCtaHref: z.string().trim().min(1).max(200),
  imagePath: z.string().nullable(),
});

export const processStepSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(400),
});

export const processContentSchema = z.object({
  steps: z.array(processStepSchema).min(1).max(8),
});

export const homeSectionMetaSchema = z.object({
  key: z.string().min(1),
  title: z.string().trim().max(200).optional().or(z.literal('')),
  subtitle: z.string().trim().max(400).optional().or(z.literal('')),
  is_visible: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});
