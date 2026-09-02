'use client';

import { useTransition, useState } from 'react';
import { updateContactRequestStatus, deleteContactRequest } from '@/lib/actions/contact-requests';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { formatDate } from '@/lib/utils/format';
import type { ContactRequest } from '@/types/domain';

const STATUS_LABEL: Record<ContactRequest['status'], string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
};

export function RequestRow({ request }: { request: ContactRequest }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: ContactRequest['status']) {
    setError(null);
    startTransition(async () => {
      const result = await updateContactRequestStatus(request.id, status);
      if (!result.success) setError(result.message);
    });
  }

  return (
    <tr className="border-b border-stone/40 align-top last:border-0">
      <td className="px-4 py-3">
        <p>{request.name}</p>
        <p className="text-sm text-espresso">{request.contact}</p>
      </td>
      <td className="px-4 py-3 text-espresso">{request.request_type || '—'}</td>
      <td className="max-w-xs px-4 py-3 text-espresso">{request.comment || '—'}</td>
      <td className="px-4 py-3 text-sm text-stone">{formatDate(request.created_at)}</td>
      <td className="px-4 py-3">
        <select
          value={request.status}
          disabled={isPending}
          onChange={(e) => handleStatusChange(e.target.value as ContactRequest['status'])}
          className="rounded border border-stone bg-canvas px-2 py-1 text-sm"
        >
          {(Object.keys(STATUS_LABEL) as ContactRequest['status'][]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <ConfirmDialog
          triggerLabel="Удалить"
          title="Удалить заявку?"
          onConfirm={() => deleteContactRequest(request.id)}
        />
      </td>
    </tr>
  );
}
