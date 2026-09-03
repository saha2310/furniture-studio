import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { PageHeader } from '@/components/admin/shared/PageHeader';

const STATUS_LABEL = { new: 'Новая', in_progress: 'В работе', done: 'Готово' } as const;
const normalize = (value: string | null) => value?.replace(/\r\n/g, '\n') ?? '';

export default async function ContactRequestPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: request, error } = await supabase.from('contact_requests').select('*').eq('id', params.id).maybeSingle();
  if (error || !request) notFound();

  return <div className="max-w-5xl">
    <PageHeader title="Заявка" description={formatDate(request.created_at)} />
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <section className="border border-white/10 bg-[#171716] p-5"><p className="eyebrow">Контакт</p><p className="mt-4 break-words text-xl text-white">{request.name || 'Без имени'}</p><p className="mt-2 break-words text-sm leading-6 text-white/65">{request.contact || 'Контакт не указан'}</p></section>
      <section className="border border-white/10 bg-[#171716] p-5"><p className="eyebrow">Запрос</p><p className="mt-4 break-words text-xl text-white">{request.request_type || 'Не указан'}</p><p className="mt-2 text-xs text-white/45">Статус: {STATUS_LABEL[request.status as keyof typeof STATUS_LABEL] ?? 'Новая'}</p></section>
      <section className="border border-white/10 bg-[#171716] p-5"><p className="eyebrow">Дата</p><p className="mt-4 text-base text-white">{formatDate(request.created_at)}</p><p className="mt-2 text-xs text-white/40">ID: {request.id}</p></section>
    </div>
    <section className="mt-4 border border-white/10 bg-[#171716] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><p className="eyebrow">Сообщение клиента</p><p className="mt-2 text-xs text-white/40">Полный текст. Прокручивается внутри фиксированной области.</p></div><span className="text-[10px] uppercase tracking-[0.12em] text-white/35">{request.comment?.length ?? 0} знаков</span></div><div className="mt-5 h-[min(52vh,420px)] min-h-[220px] overflow-y-auto overscroll-contain pr-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.22)_transparent]"><p className="break-words whitespace-pre-wrap text-sm leading-7 text-white/85">{normalize(request.comment) || 'Комментарий не оставлен.'}</p></div></section>
    <Link href="/admin/contacts" className="mt-5 inline-flex min-h-10 items-center text-sm text-white/50 hover:text-white">← Вернуться к заявкам</Link>
  </div>;
}
