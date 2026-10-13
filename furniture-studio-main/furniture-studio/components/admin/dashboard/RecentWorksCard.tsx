import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';
import type { WorkWithUrls } from '@/types/domain';

// Статичный бейдж статуса — визуально как в WorkStatusToggle (● / ○ + цвет),
// но без клика/подтверждения: здесь это просто индикатор в списке, менять
// статус со сводной страницы не нужно (для этого есть /admin/works).
// Текст "Скрыто" — тот же термин, что и везде в админке для status=draft
// (WorkStatusToggle, WorkPreviewPopover, фильтр в WorkGrid).
function StatusDot({ status }: { status: WorkWithUrls['status'] }) {
  const isPublished = status === 'published';
  return (
    <span
      className={`shrink-0 whitespace-nowrap text-[11px] tracking-wide ${
        isPublished ? 'text-emerald-400/90' : 'text-ink/40'
      }`}
    >
      {isPublished ? '● Опубликовано' : '○ Скрыто'}
    </span>
  );
}

export function RecentWorksCard({ works }: { works: WorkWithUrls[] }) {
  return (
    <div className="border border-ink/10 bg-surface">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-sm font-medium text-ink">Последние работы</h2>
        <Link href="/admin/works" className="text-xs text-espresso hover:text-ink hover:underline">
          Все работы →
        </Link>
      </div>

      {works.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink/50">Пока нет ни одной работы.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {works.map((work) => (
            <li key={work.id}>
              <Link
                href={`/admin/works/${work.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.02]"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-canvas">
                  {work.coverImage?.url ? (
                    <Image src={work.coverImage.url} alt="" fill sizes="48px" quality={50} className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] leading-tight text-ink">{work.title}</p>
                  <p className="mt-0.5 truncate text-xs text-ink/45">{work.category?.name ?? '—'}</p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <StatusDot status={work.status} />
                  <span className="text-xs text-ink/40">{formatDate(work.updated_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
