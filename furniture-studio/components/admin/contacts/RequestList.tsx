'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTransition } from 'react';
import { updateContactRequestStatus, deleteContactRequest } from '@/lib/actions/contact-requests';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import type { ContactRequest } from '@/types/domain';

const STATUS: Array<{ key: ContactRequest['status'] | 'all'; label: string }> = [
  { key: 'all', label: 'Все' }, { key: 'new', label: 'Новые' }, { key: 'in_progress', label: 'В работе' }, { key: 'done', label: 'Завершённые' },
];
const preview = (value: string, limit = 120) => { const text = value.replace(/\s+/g, ' ').trim(); return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text; };

function StatusSelect({ request }: { request: ContactRequest }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div><select aria-label={`Статус заявки ${request.id}`} disabled={pending} defaultValue={request.status} onChange={(e) => { setError(null); const value = e.target.value as ContactRequest['status']; startTransition(async () => { const result = await updateContactRequestStatus(request.id, value); if (!result.success) setError(result.message); }); }} className="h-10 w-full border border-ink/10 bg-canvas px-2 text-xs text-ink"><option value="new">Новая</option><option value="in_progress">В работе</option><option value="done">Готово</option></select>{error && <p className="mt-1 text-[10px] text-red-200">{error}</p>}</div>;
}

function RowActions({ request }: { request: ContactRequest }) { return <div className="flex items-center justify-end gap-3"><Link href={`/admin/contacts/${request.id}`} className="text-xs uppercase tracking-[0.12em] text-ink/65 hover:text-ink">Открыть</Link><ConfirmDialog triggerLabel="Удалить" title="Удалить заявку?" description="Это действие необратимо." onConfirm={() => deleteContactRequest(request.id)} /></div>; }

export function RequestList({ requests }: { requests: ContactRequest[] }) {
  const [filter, setFilter] = useState<ContactRequest['status'] | 'all'>('all');
  const filtered = useMemo(() => filter === 'all' ? requests : requests.filter((item) => item.status === filter), [filter, requests]);
  const counts = useMemo(() => ({ new: requests.filter((r) => r.status === 'new').length, in_progress: requests.filter((r) => r.status === 'in_progress').length, done: requests.filter((r) => r.status === 'done').length }), [requests]);

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-3">
      {STATUS.map((item) => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`min-h-10 border px-3 text-xs transition-colors ${filter === item.key ? 'border-ink/25 bg-ink text-canvas' : 'border-ink/10 text-ink/55 hover:text-ink'}`}>{item.label}{item.key !== 'all' && <span className="ml-2 opacity-50">{counts[item.key]}</span>}</button>)}
    </div>

    {filtered.length === 0 ? <div className="border border-dashed border-ink/10 py-12 text-center text-sm text-ink/45">Заявок в этом разделе нет.</div> : <>
      <div className="hidden overflow-hidden border border-ink/10 bg-surface lg:block">
        <table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[19%]"/><col className="w-[14%]"/><col className="w-[33%]"/><col className="w-[12%]"/><col className="w-[13%]"/><col className="w-[9%]"/></colgroup><thead className="border-b border-ink/10 bg-ink/[0.03] text-ink/45"><tr>{['Контакт','Запрос','Сообщение','Дата','Статус',''].map((x) => <th key={x} className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">{x}</th>)}</tr></thead><tbody>{filtered.map((request) => <tr key={request.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.015]"><td className="px-4 py-4 align-top"><Link href={`/admin/contacts/${request.id}`} className="block min-w-0"><p className="truncate text-ink">{preview(request.name || 'Без имени', 34)}</p><p className="mt-1 truncate text-xs text-ink/55">{preview(request.contact || 'Контакт не указан', 40)}</p></Link></td><td className="px-4 py-4 align-top text-ink/65">{preview(request.request_type || 'Не указан', 28)}</td><td className="px-4 py-4 align-top"><Link href={`/admin/contacts/${request.id}`} className="block"><p className="break-words text-[13px] leading-5 text-ink/70">{request.comment ? preview(request.comment) : 'Комментарий не оставлен.'}</p><span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-ink/55">Открыть полную заявку →</span></Link></td><td className="whitespace-nowrap px-4 py-4 align-top text-xs text-ink/45">{formatDate(request.created_at)}</td><td className="px-4 py-4 align-top"><StatusSelect request={request}/></td><td className="px-4 py-4 align-top"><RowActions request={request}/></td></tr>)}</tbody></table>
      </div>
      <div className="space-y-3 lg:hidden">{filtered.map((request) => <article key={request.id} className="border border-ink/10 bg-surface p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><Link href={`/admin/contacts/${request.id}`} className="text-base text-ink">{preview(request.name || 'Без имени', 40)}</Link><p className="mt-1 truncate text-xs text-ink/50">{preview(request.contact || 'Контакт не указан', 48)}</p></div><span className={`shrink-0 text-[9px] uppercase tracking-[0.12em] ${request.status === 'new' ? 'text-ink' : 'text-ink/45'}`}>{request.status === 'new' ? 'Новая' : request.status === 'in_progress' ? 'В работе' : 'Готово'}</span></div><p className="mt-4 text-xs uppercase tracking-[0.12em] text-ink/30">{preview(request.request_type || 'Запрос не указан', 30)}</p><p className="mt-3 break-words text-sm leading-6 text-ink/65">{request.comment ? preview(request.comment, 140) : 'Комментарий не оставлен.'}</p><div className="mt-4 border-t border-ink/10 pt-3"><div className="grid grid-cols-2 gap-3"><div><p className="text-[9px] uppercase tracking-[0.12em] text-ink/30">Дата</p><p className="mt-1 text-xs text-ink/50">{formatDate(request.created_at)}</p></div><StatusSelect request={request}/></div></div><div className="mt-4"><RowActions request={request}/></div></article>)}</div>
    </>}
  </div>;
}
