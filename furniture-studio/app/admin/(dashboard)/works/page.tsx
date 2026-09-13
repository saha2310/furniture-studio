import Link from 'next/link';
import { getAllWorksAdmin } from '@/lib/queries/works';
import { WorkTable } from '@/components/admin/works/WorkTable';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function AdminWorksPage() {
  const works = await getAllWorksAdmin();

  return (
    <div>
      <PageHeader
        title="Работы"
        description={`Всего: ${works.length}`}
        action={
          <Link href="/admin/works/new" className="rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso">
            Добавить работу
          </Link>
        }
      />

      <div className="mt-6">
        {works.length === 0 ? (
          <EmptyState title="Работ пока нет" description="Добавьте первую работу, чтобы она появилась на сайте." />
        ) : (
          <WorkTable works={works} />
        )}
      </div>
    </div>
  );
}
