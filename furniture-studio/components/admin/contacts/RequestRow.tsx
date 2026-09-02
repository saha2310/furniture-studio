'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { updateContactRequestStatus, deleteContactRequest } from '@/lib/actions/contact-requests';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import type { ContactRequest } from '@/types/domain';

const STATUS_LABEL: Record<ContactRequest['status'], string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
};

const PREVIEW_LIMIT = 96;

function compactText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? `${normalized.slice(0, limit).trimEnd()}…` : normalized;
}

export function RequestRow({ request }: { request: ContactRequest }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const preview = request.comment ? compactText(request.comment, PREVIEW_LIMIT) : 'Комментарий не оставлен.';

  function handleStatusChange(status: ContactRequest['status']) {
    setError(null);
    startTransition(async () => {
      const result = await updateContactRequestStatus(request.id, status);
      if (!result.success) setError(result.message);
    });
  }

  return (
    <tr className="border-b border-white/10 align-middle last:border-0 hover:bg-white/[0.02]">
      <td className="w-[20%] px-4 py-4 align-top">
        <Link href={`/admin/contacts/${request.id}`} className="block min-w-0 hover:text-white">
          <p className="truncate text-white">{compactText(request.name || 'Без имени', 36)}</p>
          <p className="mt-1 truncate text-xs text-white/60">{compactText(request.contact || 'Контакт не указан', 42)}</p>
        </Link>
      </td>
      <td className="w-[16%] px-4 py-4 align-top text-white/75">
        <Link href={`/admin/contacts/${request.id}`} className="block truncate hover:text-white">
          {compactText(request.request_type || 'Не указан', 28)}
        </Link>
      </td>
      <td className="w-[34%] px-4 py-4 align-top">
        <Link href={`/admin/contacts/${request.id}`} className="block max-w-[34rem] hover:text-white">
          <p className="break-words text-[13px] leading-5 text-white/75">{preview}</p>
          <span className="mt-2 inline-flex text-[10px] uppercase tracking-[0.12em] text-white/80">
            Открыть заявку →
          </span>
        </Link>
      </td>
      <td className="w-[12%] whitespace-nowrap px-4 py-4 align-top text-xs text-white/55">
        {formatDate(request.created_at)}
      </td>
      <td className="w-[12%] px-4 py-4 align-top">
        <select
          value={request.status}
          disabled={isPending}
          onChange={(e) => handleStatusChange(e.target.value as ContactRequest['status'])}
          className="w-full border border-white/15 bg-[#171716] px-2.5 py-2 text-xs text-white"
        >
          {(Object.keys(STATUS_LABEL) as ContactRequest['status'][]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        {error && <p role="alert" className="mt-2 text-[11px] leading-4 text-red-200">{error}</p>}
      </td>
      <td className="w-[6%] px-4 py-4 text-right align-top">
        <ConfirmDialog triggerLabel="Удалить" title="Удалить заявку?" onConfirm={() => deleteContactRequest(request.id)} />
      </td>
    </tr>
  );
}
