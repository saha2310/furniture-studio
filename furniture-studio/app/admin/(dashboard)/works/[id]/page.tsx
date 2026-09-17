import { notFound } from 'next/navigation';
import {
  getWorkByIdAdmin,
  getCategories,
  getWorkGroupVariantsAdmin,
  getStandaloneWorksAdmin,
  getWorkExtraCategoryIds,
  getUsedColorsAdmin,
} from '@/lib/queries/works';
import { updateWork } from '@/lib/actions/works';
import { WorkForm } from '@/components/admin/works/WorkForm';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function EditWorkPage({ params }: { params: { id: string } }) {
  const [work, categories] = await Promise.all([getWorkByIdAdmin(params.id), getCategories()]);

  if (!work) notFound();

  const [colorVariants, attachCandidates, extraCategoryIds, usedColors] = await Promise.all([
    getWorkGroupVariantsAdmin(work.group_id, work.id),
    getStandaloneWorksAdmin(work.id),
    getWorkExtraCategoryIds(work.id),
    getUsedColorsAdmin(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader title={work.title} description="Редактирование работы" />

      <div className="mt-6">
        <WorkForm
          // Ключ обязателен: без него переход между цветовыми вариантами
          // через VariantBar (Link на /admin/works/{siblingId}) остаётся на
          // той же позиции дерева React, и клиентский компонент не
          // размонтируется — поля формы (useState из initialData) и
          // WorkImageEditor молча продолжают показывать данные предыдущего
          // товара, пока не обновить страницу вручную. key={work.id}
          // заставляет React пересоздать форму заново при каждой смене id.
          key={work.id}
          categories={categories}
          initialData={{ ...work, extraCategoryIds }}
          colorVariants={colorVariants}
          attachCandidates={attachCandidates}
          usedColors={usedColors}
          action={updateWork.bind(null, work.id)}
          submitLabel="Сохранить изменения"
        />
      </div>

    </div>
  );
}
