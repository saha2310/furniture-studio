'use server';

import { createClient } from '@/lib/supabase/server';
import { contactSchema } from '@/lib/validations/contact.schema';
import { isRateLimited } from '@/lib/utils/rate-limit';
import { headers } from 'next/headers';

export interface ContactActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitContactRequest(
  _prevState: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    contact: String(formData.get('contact') ?? ''),
    request_type: String(formData.get('request_type') ?? ''),
    comment: String(formData.get('comment') ?? ''),
    source_page: String(formData.get('source_page') ?? ''),
    website: String(formData.get('website') ?? ''), // honeypot
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[String(issue.path[0])] = issue.message;
    });
    return { status: 'error', message: 'Проверьте поля формы', fieldErrors };
  }

  // Honeypot заполнен ботом — молча "успех", без записи в базу
  if (parsed.data.website) {
    return { status: 'success', message: 'Спасибо! Мы свяжемся с вами в ближайшее время.' };
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(ip)) {
    return {
      status: 'error',
      message: 'Слишком много заявок за короткое время. Попробуйте позже или напишите нам напрямую.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_requests').insert({
    name: parsed.data.name,
    contact: parsed.data.contact,
    request_type: parsed.data.request_type || null,
    comment: parsed.data.comment || null,
    source_page: parsed.data.source_page || null,
  });

  if (error) {
    console.error('submitContactRequest failed', error.message);
    return {
      status: 'error',
      message: 'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.',
    };
  }

  return { status: 'success', message: 'Спасибо! Мы свяжемся с вами в ближайшее время.' };
}
