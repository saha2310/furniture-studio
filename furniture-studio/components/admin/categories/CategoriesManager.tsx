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
import { AdminSection } from '@/components/admin/shared/AdminSection';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="min-h-11 border border-white/15 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-black hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-45">{pending ? 'Сохранение…' : label}</button>;
}

function Fields({ values, controlled = false, onName, onSlug }: { values: { name: string; slug: string; sort: number }; controlled?: boolean; onName?: (value: string) => void; onSlug?: (value: string) => void }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr),120px]">
    <Input name="name" label="Название" required value={controlled ? values.name : undefined} defaultValue={controlled ? undefined : values.name} onChange={controlled ? (e) => onName?.(e.target.value) : undefined} />
    <Input name="slug" label="Адрес страницы (URL)" required value={controlled ? values.slug : undefined} defaultValue={controlled ? undefined : values.slug} onChange={controlled ? (e) => onSlug?.(e.target.value) : undefined} />
    <Input name="sort_order" type="number" label="Порядок" defaultValue={values.sort} />
  </div>;
}

function NewCategoryForm() {
  const [state, formAction] = useFormState(createCategory, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);

  return <AdminSection title="Добавить категорию" description="Новое направление появится в фильтрах и на сайте." defaultOpen>
    <form action={formAction} className="space-y-5">
      <Fields controlled values={{ name, slug, sort: 0 }} onName={(value) => { setName(value); if (!touched) setSlug(slugify(value)); }} onSlug={(value) => { setTouched(true); setSlug(value); }} />
      <SingleImageField fieldName="category_image" label="Изображение категории" help="Изображение используется в карточке категории. Перед сохранением можно выбрать пропорцию, масштаб и положение кадра." cropRatio={4 / 3} compact />
      <div className="flex flex-wrap items-center gap-3"><Submit label="Добавить категорию" />{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
    </form>
  </AdminSection>;
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCategory.bind(null, category.id), null);

  if (editing) return <form action={formAction} className="border-b border-white/10 p-5 last:border-0 sm:p-6">
    <div className="space-y-5">
      <Fields values={{ name: category.name, slug: category.slug, sort: category.sort_order }} />
      <SingleImageField fieldName="category_image" existingPath={category.image_path} label="Изображение категории" help="Изменения текста и изображения сохраняются одной кнопкой ниже." cropRatio={4 / 3} compact />
      <div className="flex flex-wrap items-center gap-3"><Submit label="Сохранить изменения" /><button type="button" onClick={() => setEditing(false)} className="min-h-11 border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-white/55 hover:text-white">Отмена</button>{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
    </div>
  </form>;

  return <article className="border-b border-white/10 p-4 last:border-0 sm:p-5">
    <div className="flex gap-4">
      <div className="h-20 w-28 shrink-0 overflow-hidden bg-black sm:h-24 sm:w-36">{category.image_path ? <img src={workImageUrl(category.image_path)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] uppercase tracking-[0.14em] text-white/30">Нет фото</div>}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-base text-white">{category.name}</p><p className="mt-1 truncate text-xs text-white/40">/{category.slug}</p><p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-white/30">Порядок {category.sort_order}</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-4 border-t border-white/10 pt-3"><button type="button" onClick={() => setEditing(true)} className="text-xs uppercase tracking-[0.12em] text-white/75 hover:text-white">Изменить</button><ConfirmDialog triggerLabel="Удалить" title={`Удалить категорию «${category.name}»?`} description="Удалить можно только категорию без работ." onConfirm={() => deleteCategory(category.id)} /></div>
  </article>;
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  return <div className="space-y-5"><NewCategoryForm /><section className="border border-white/10 bg-[#171716]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6"><div><p className="text-sm text-white">Существующие категории</p><p className="mt-1 text-xs text-white/40">{categories.length} шт.</p></div></div>{categories.length === 0 ? <p className="p-8 text-center text-sm text-white/45">Категорий пока нет.</p> : categories.map((category) => <CategoryRow key={category.id} category={category} />)}</section></div>;
}
