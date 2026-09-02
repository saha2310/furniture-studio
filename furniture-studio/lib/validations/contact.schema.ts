import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(100),
  contact: z.string().trim().min(4, 'Укажите телефон или мессенджер').max(120),
  request_type: z.string().trim().max(60).optional().or(z.literal('')),
  comment: z.string().trim().max(2000).optional().or(z.literal('')),
  source_page: z.string().trim().max(200).optional().or(z.literal('')),
  // honeypot-поле: реальные пользователи его не видят и не заполняют
  website: z.string().max(0, 'Спам-фильтр не пройден').optional().or(z.literal('')),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
