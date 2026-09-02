'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { updateContactRequestStatus, deleteContactRequest } from '@/lib/actions/contact-requests';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import type { ContactRequest } from '@/types/domain';

const STATUS_LABEL: Record<ContactRequest['status'], string> = { new: 'Новая', in_progress: 'В работе', done: 'Готово' };
const PREVIEW_LIMIT = 180;

export function RequestRow({ request }: { request: ContactRequest }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const preview = request.comment ? (request.comment.length > PREVIEW_LIMIT ? `${request.comment.slice(0, PREVIEW_LIMIT).trimEnd()}…` : request.comment) : '—';

  function handleStatusChange(status: ContactRequest['status']) {
    setError(null);
    startTransition(async () => { const result = await updateContactRequestStatus(request.id, status); if (!result.success) setError(result.message); });
  }

  return <tr className="border-b border-white/10 align-top last:border-0">
    <td className="px-4 py-3"><Link href={`/admin/contacts/${request.id}`} className="block hover:text-white"><p className="text-white">{request.name}</p><p className="text-sm text-white/55">{request.contact}</p></Link></td>
    <td className="px-4 py-3 text-white/70">{request.request_type || '—'}</td>
    <td className="max-w-xs px-4 py-3 text-white/65"><Link href={`/admin/contacts/${request.id}`} className="block hover:text-white"><span>{preview}</span>{request.comment && request.comment.length > PREVIEW_LIMIT && <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-white/85">Открыть всю заявку →</span>}</Link></td>
    <td className="px-4 py-3 text-sm text-white/45">{formatDate(request.created_at)}</td>
    <td className="px-4 py-3"><select value={request.status} disabled={isPending} onChange={(e) => handleStatusChange(e.target.value as ContactRequest['status'])} className="border border-white/15 bg-[#171716] px-2 py-2 text-sm text-white"><>{(Object.keys(STATUS_LABEL) as ContactRequest['status'][]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</></select>{error && <p role="alert" className="mt-1 text-xs text-red-200">{error}</p>}</td>
    <td className="px-4 py-3 text-right"><ConfirmDialog triggerLabel="Удалить" title="Удалить заявку?" onConfirm={() => deleteContactRequest(request.id)} /></td>
  </tr>;
}
