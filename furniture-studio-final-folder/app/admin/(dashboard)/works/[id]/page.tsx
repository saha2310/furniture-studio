import { notFound } from 'next/navigation';
import { getWorkByIdAdmin, getCategories } from '@/lib/queries/works';
import { updateWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function EditWorkPage({ params }: { params: { id: string } }) {
  const [work, categories] = await Promise.all([getWorkByIdAdmin(params.id), getCategories()]);

  if (!work) notFound();

  return (
    <div className="max-w-6xl">
      <PageHeader title={work.title} description="Редактирование работы" />

      <div className="mt-6">
        <WorkForm
          categories={categories}
          initialData={work}
          action={updateWork.bind(null, work.id)}
          submitLabel="Сохранить изменения"
        />
      </div>

    </div>
  );
}
