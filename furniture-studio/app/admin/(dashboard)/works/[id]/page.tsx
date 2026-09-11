import { notFound } from 'next/navigation';
import { getWorkByIdAdmin, getCategories, getWorkGroupVariantsAdmin } from '@/lib/queries/works';
import { updateWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function EditWorkPage({ params }: { params: { id: string } }) {
  const [work, categories] = await Promise.all([getWorkByIdAdmin(params.id), getCategories()]);

  if (!work) notFound();

  const colorVariants = await getWorkGroupVariantsAdmin(work.group_id, work.id);

  return (
    <div className="max-w-6xl">
      <PageHeader title={work.title} description="Редактирование работы" />

      <div className="mt-6">
        <WorkForm
          categories={categories}
          initialData={work}
          colorVariants={colorVariants}
          action={updateWork.bind(null, work.id)}
          submitLabel="Сохранить изменения"
        />
      </div>

    </div>
  );
}
