'use client';

import Link from 'next/link';
import { deleteWork } from '@/lib/actions/works';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import type { WorkWithUrls } from '@/types/domain';

export function WorkTable({ works }: { works: WorkWithUrls[] }) {
  return (
    <div className="overflow-x-auto rounded border border-stone/70">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-stone/70 bg-surface text-espresso">
          <tr>
            <th className="px-4 py-3 font-normal">Работа</th>
            <th className="px-4 py-3 font-normal">Категория</th>
            <th className="px-4 py-3 font-normal">Статус</th>
            <th className="px-4 py-3 font-normal">Featured</th>
            <th className="px-4 py-3 font-normal" />
          </tr>
        </thead>
        <tbody>
          {works.map((work) => (
            <tr key={work.id} className="border-b border-stone/40 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/admin/works/${work.id}`} className="hover:text-walnut">
                  {work.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-espresso">{work.category?.name}</td>
              <td className="px-4 py-3">
                <Badge tone={work.status === 'published' ? 'default' : 'muted'}>
                  {work.status === 'published' ? 'Опубликовано' : 'Черновик'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-espresso">{work.is_featured ? 'Да' : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-4">
                  <Link href={`/admin/works/${work.id}`} className="text-sm hover:text-walnut">
                    Изменить
                  </Link>
                  <ConfirmDialog
                    triggerLabel="Удалить"
                    title={`Удалить «${work.title}»?`}
                    description="Все фотографии этой работы также будут удалены. Это действие необратимо."
                    onConfirm={() => deleteWork(work.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
