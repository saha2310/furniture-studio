'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/categories';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { SingleImageField } from '@/components/admin/shared/SingleImageField';
import { workImageUrl } from '@/lib/utils/image';
import { slugify } from '@/lib/utils/slug';
import type { Category } from '@/types/domain';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="bg-white px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-black disabled:opacity-50">{pending ? 'Сохраняем…' : label}</button>;
}

function NewCategoryForm() {
  const [state, formAction] = useFormState(createCategory, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="border border-white/10 bg-[#171716] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr,1fr,180px]">
        <Input name="name" label="Название" required value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
        <Input name="slug" label="Адрес страницы (URL)" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} />
        <Input name="sort_order" type="number" label="Порядок" defaultValue="0" />
      </div>
      <div className="mt-5 max-w-xl">
        <SingleImageField fieldName="category_image" label="Изображение категории" help="Рекомендуется горизонтальная фотография. Перед сохранением можно выбрать пропорцию и вручную кадрировать изображение." cropRatio={4 / 3} compact />
      </div>
      <div className="mt-5 flex items-center gap-4"><SubmitButton label="Добавить категорию" />{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCategory.bind(null, category.id), null);

  if (editing) {
    return (
      <form action={formAction} className="border-b border-white/10 p-5 last:border-0 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr,1fr,180px]">
          <Input name="name" label="Название" defaultValue={category.name} required />
          <Input name="slug" label="Адрес страницы (URL)" defaultValue={category.slug} required />
          <Input name="sort_order" type="number" label="Порядок" defaultValue={category.sort_order} />
        </div>
        <div className="mt-5 max-w-xl">
          <SingleImageField fieldName="category_image" existingPath={category.image_path} label="Изображение категории" help="Изменения изображения и текста сохраняются одной кнопкой ниже." cropRatio={4 / 3} compact />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><SubmitButton label="Сохранить изменения" /><button type="button" onClick={() => setEditing(false)} className="border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-white/70 hover:text-white">Отмена</button>{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
      </form>
    );
  }

  return (
    <div className="border-b border-white/10 p-5 last:border-0 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-24 w-36 shrink-0 overflow-hidden bg-black">
            {category.image_path ? <img src={workImageUrl(category.image_path)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.12em] text-white/35">Нет фото</div>}
          </div>
          <div className="min-w-0"><p className="text-base text-white">{category.name}</p><p className="mt-1 text-xs text-white/45">/{category.slug}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/35">Порядок: {category.sort_order}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-4"><button type="button" onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-[0.12em] text-white/70 hover:text-white">Изменить</button><ConfirmDialog triggerLabel="Удалить" title={`Удалить категорию «${category.name}»?`} onConfirm={() => deleteCategory(category.id)} /></div>
      </div>
    </div>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  return <div><NewCategoryForm /><div className="mt-6 border border-white/10 bg-[#111110]">{categories.length === 0 ? <p className="p-8 text-center text-sm text-white/45">Категорий пока нет.</p> : categories.map((category) => <CategoryRow key={category.id} category={category} />)}</div></div>;
}
