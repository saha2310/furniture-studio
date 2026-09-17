import { getCategories, getWorkGroupVariantsAdmin, getUsedColorsAdmin } from '@/lib/queries/works';
import { createWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import type { WorkWithUrls } from '@/types/domain';

export default async function NewWorkPage({ searchParams }: { searchParams: { group?: string; category?: string; title?: string } }) {
  const categories = await getCategories();
  // ?group=... — сюда попадаем по ссылке «+ Добавить цвет» с уже
  // существующего товара: категория и название подставлены для удобства,
  // но остаются редактируемыми, а фотографии/цвет — свои с нуля.
  const groupId = searchParams.group?.trim() || undefined;
  const isAddingColor = !!groupId;
  const [colorVariants, usedColors] = await Promise.all([
    groupId ? getWorkGroupVariantsAdmin(groupId) : Promise.resolve<WorkWithUrls[]>([]),
    getUsedColorsAdmin(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader title={isAddingColor ? 'Новый цвет товара' : 'Новая работа'} />

      {categories.length === 0 ? (
        <p className="mt-6 text-sm text-espresso">
          Сначала создайте хотя бы одну категорию в разделе «Категории».
        </p>
      ) : (
        <div className="mt-6">
          <WorkForm
            // См. комментарий у аналогичного key в app/admin/(dashboard)/works/[id]/page.tsx:
            // без ключа переход "+ Новый цвет" с одного товара сразу на "+ Новый
            // цвет" другого (тот же маршрут /works/new, другой ?group=) не
            // размонтирует форму, и поля могут остаться от предыдущего вызова.
            key={`${groupId ?? 'new'}-${searchParams.category ?? ''}`}
            categories={categories}
            action={createWork}
            submitLabel={isAddingColor ? 'Добавить цвет' : 'Создать работу'}
            redirectToDetailOnSuccess
            groupId={groupId}
            colorVariants={colorVariants}
            usedColors={usedColors}
            prefillTitle={isAddingColor ? searchParams.title : undefined}
            prefillCategoryId={isAddingColor ? searchParams.category : undefined}
          />
        </div>
      )}
    </div>
  );
}
