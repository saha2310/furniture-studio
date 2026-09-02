import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { PageHeader } from '@/components/admin/shared/PageHeader';

const STATUS_LABEL = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
} as const;

export default async function ContactRequestPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from('contact_requests')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !request) notFound();

  return (
    <div className="max-w-5xl">
      <PageHeader title="Заявка" description={formatDate(request.created_at)} />

      <div className="mt-8 grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="border border-white/10 bg-[#171716] p-6">
            <p className="eyebrow">контакт</p>
            <p className="mt-4 break-words text-xl text-white">{request.name || 'Без имени'}</p>
            <p className="mt-2 break-words text-sm leading-6 text-white/70">{request.contact || 'Контакт не указан'}</p>
          </div>

          <div className="border border-white/10 bg-[#171716] p-6">
            <p className="eyebrow">запрос</p>
            <p className="mt-4 break-words text-xl text-white">{request.request_type || 'Не указан'}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/55">
              Статус: {STATUS_LABEL[request.status as keyof typeof STATUS_LABEL] ?? 'Новая'}
            </p>
          </div>
        </section>

        <section className="border border-white/10 bg-[#171716] p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="eyebrow">сообщение клиента</p>
              <p className="mt-2 text-xs text-white/45">Полный текст открыт внутри прокручиваемой области</p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-white/45">
              {request.comment ? `${request.comment.length} знаков` : '0 знаков'}
            </span>
          </div>

          <div className="mt-5 max-h-[360px] overflow-y-auto overscroll-contain pr-3 [scrollbar-color:rgba(255,255,255,.22)_transparent] [scrollbar-width:thin]">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-white/85">
              {request.comment || 'Комментарий не оставлен.'}
            </p>
          </div>
        </section>
      </div>

      <Link href="/admin/contacts" className="mt-6 inline-flex text-sm text-white/65 transition-colors hover:text-white">
        ← Вернуться к заявкам
      </Link>
    </div>
  );
}
