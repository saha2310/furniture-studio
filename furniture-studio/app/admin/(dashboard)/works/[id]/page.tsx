import { notFound } from 'next/navigation';
import { getWorkByIdAdmin, getCategories } from '@/lib/queries/works';
import { updateWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { ImageManager } from '@/components/admin/works/ImageManager';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function EditWorkPage({ params }: { params: { id: string } }) {
  const [work, categories] = await Promise.all([getWorkByIdAdmin(params.id), getCategories()]);

  if (!work) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title={work.title} description="Редактирование работы" />

      <div className="mt-6">
        <WorkForm
          categories={categories}
          initialData={work}
          action={updateWork.bind(null, work.id)}
          submitLabel="Сохранить изменения"
        />
      </div>

      <div className="mt-12">
        <h2 className="text-lg">Фотографии</h2>
        <div className="mt-4">
          <ImageManager workId={work.id} images={work.images} coverImageId={work.cover_image_id} />
        </div>
      </div>
    </div>
  );
}
