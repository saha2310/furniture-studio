'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { createCategory, updateCategory, deleteCategory, uploadCategoryImage, deleteCategoryImage } from '@/lib/actions/categories';
import { workImageUrl } from '@/lib/utils/image';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { slugify } from '@/lib/utils/slug';
import type { Category } from '@/types/domain';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : label}
    </button>
  );
}

function NewCategoryForm() {
  const [state, formAction] = useFormState(createCategory, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setName('');
        setSlug('');
        setSlugTouched(false);
      }}
      className="flex flex-wrap items-end gap-4 rounded border border-stone/70 p-5"
    >
      <Input
        name="name"
        label="Название"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
      />
      <Input
        name="slug"
        label="Адрес страницы (URL)"
        required
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value);
        }}
      />
      <SubmitButton label="Добавить категорию" />
      {state && !state.success && <FormStatus state={{ status: 'error', message: state.message }} />}
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const router = useRouter();
  const [imagePending, setImagePending] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateCategory.bind(null, category.id), null);

  if (editing) {
    return (
      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-stone/40 p-4">
        <Input name="name" label="Название" defaultValue={category.name} required />
        <Input name="slug" label="Адрес страницы (URL)" defaultValue={category.slug} required />
        <SubmitButton label="Сохранить" />
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-espresso hover:underline">
          Отмена
        </button>
        {state && !state.success && <FormStatus state={{ status: 'error', message: state.message }} />}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-b border-stone/40 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-28 overflow-hidden border border-stone/50 bg-surface">{category.image_path ? <img src={workImageUrl(category.image_path)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-stone">Нет фото</span>}</div>
        <div><p>{category.name}</p><p className="text-sm text-stone">/{category.slug}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer text-sm text-espresso hover:text-ink">Изображение<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imagePending} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append('file', file); setImagePending(true); uploadCategoryImage(category.id, fd).then(r => { setImageMessage(r.message); if (r.success) router.refresh(); }).finally(() => setImagePending(false)); }} /></label>
        {category.image_path && <button type="button" onClick={() => { setImagePending(true); deleteCategoryImage(category.id).then(r => { setImageMessage(r.message); if (r.success) router.refresh(); }).finally(() => setImagePending(false)); }} className="text-sm text-red-700">Удалить фото</button>}
        <button type="button" onClick={() => setEditing(true)} className="text-sm hover:text-walnut">
          Изменить
        </button>
        {imageMessage && <span className="text-xs text-espresso">{imageMessage}</span>}
        <ConfirmDialog
          triggerLabel="Удалить"
          title={`Удалить категорию «${category.name}»?`}
          onConfirm={() => deleteCategory(category.id)}
        />
      </div>
    </div>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  return (
    <div>
      <NewCategoryForm />
      <div className="mt-6 rounded border border-stone/70">
        {categories.length === 0 ? (
          <p className="p-6 text-center text-sm text-espresso">Категорий пока нет.</p>
        ) : (
          categories.map((category) => <CategoryRow key={category.id} category={category} />)
        )}
      </div>
    </div>
  );
}
