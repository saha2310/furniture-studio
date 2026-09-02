import { getCategories } from '@/lib/queries/works';
import { createWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function NewWorkPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Новая работа" />

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-espresso">
          Сначала создайте хотя бы одну категорию в разделе «Категории».
        </p>
      ) : (
        <div className="mt-6">
          <WorkForm
            categories={categories}
            action={createWork}
            submitLabel="Создать работу"
            redirectToDetailOnSuccess
          />
        </div>
      )}
    </div>
  );
}
