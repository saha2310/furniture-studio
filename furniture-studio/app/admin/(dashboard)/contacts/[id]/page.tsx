import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function ContactRequestPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: request } = await supabase.from('contact_requests').select('*').eq('id', params.id).maybeSingle();
  if (!request) notFound();
  return <div className="max-w-3xl"><PageHeader title="Заявка" description={formatDate(request.created_at)} /><div className="mt-8 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2"><div className="bg-[#1b1a18] p-6"><p className="eyebrow">контакт</p><p className="mt-3 text-lg">{request.name}</p><p className="mt-2 text-sm text-espresso">{request.contact}</p></div><div className="bg-[#1b1a18] p-6"><p className="eyebrow">запрос</p><p className="mt-3 text-lg">{request.request_type || 'Не указан'}</p><p className="mt-2 text-sm text-stone">Статус: {request.status === 'new' ? 'Новая' : request.status === 'in_progress' ? 'В работе' : 'Готово'}</p></div></div><div className="mt-6 border border-white/10 bg-[#1b1a18] p-6"><p className="eyebrow">сообщение клиента</p><p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-ink">{request.comment || 'Комментарий не оставлен.'}</p></div><Link href="/admin/contacts" className="mt-6 inline-block text-sm text-espresso hover:text-white">← Вернуться к заявкам</Link></div>;
}
