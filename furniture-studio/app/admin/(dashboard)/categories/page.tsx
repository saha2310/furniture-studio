import { getCategories } from '@/lib/queries/works';
import { CategoriesManager } from '@/components/admin/categories/CategoriesManager';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Категории"
        description="Диваны, кресла и другие направления. Удалить можно только пустую категорию."
      />
      <div className="mt-6">
        <CategoriesManager categories={categories} />
      </div>
    </div>
  );
}
