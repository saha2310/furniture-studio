'use client';

import { toggleWorkStatus } from '@/lib/actions/works';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import type { WorkRow } from '@/types/domain';

// Клик по статусу сразу ничего не меняет — сначала подтверждение
// (ConfirmDialog), и только после него уходит мутация toggleWorkStatus.
export function WorkStatusToggle({ workId, workTitle, status }: { workId: string; workTitle: string; status: WorkRow['status'] }) {
  const isPublished = status === 'published';
  const nextStatus: WorkRow['status'] = isPublished ? 'draft' : 'published';

  return (
    <ConfirmDialog
      tone="neutral"
      triggerLabel={isPublished ? '● Опубликовано' : '○ Скрыто'}
      triggerClassName={`shrink-0 whitespace-nowrap text-[11px] tracking-wide transition-colors ${
        isPublished ? 'text-emerald-400/90 hover:text-emerald-300' : 'text-ink/40 hover:text-ink/60'
      }`}
      title={isPublished ? `Скрыть «${workTitle}»?` : `Опубликовать «${workTitle}»?`}
      description={
        isPublished
          ? 'Работа исчезнет из каталога на сайте и, если отмечена как избранная, с главной страницы.'
          : 'Работа появится в каталоге на сайте (и на главной, если отмечена как избранная).'
      }
      confirmLabel={isPublished ? 'Скрыть' : 'Опубликовать'}
      onConfirm={() => toggleWorkStatus(workId, nextStatus)}
    />
  );
}
