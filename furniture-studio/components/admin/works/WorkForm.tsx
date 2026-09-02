'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { slugify } from '@/lib/utils/slug';
import type { ActionResult } from '@/lib/actions/works';
import type { Category, WorkWithUrls } from '@/types/domain';

interface WorkFormProps {
  categories: Category[];
  initialData?: WorkWithUrls;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  redirectOnSuccess?: (id?: string) => string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : label}
    </button>
  );
}

export function WorkForm({ categories, initialData, action, submitLabel, redirectOnSuccess }: WorkFormProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initialData);
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>(
    initialData?.specs ? Object.entries(initialData.specs).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]
  );

  useEffect(() => {
    if (state?.success && redirectOnSuccess) {
      router.push(redirectOnSuccess(state.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          name="title"
          label="Название"
          required
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
        <Input
          name="slug"
          label="Slug (URL)"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Select name="category_id" label="Категория" required defaultValue={initialData?.category_id ?? ''}>
          <option value="" disabled>
            Выберите категорию
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" label="Статус" defaultValue={initialData?.status ?? 'published'}>
          <option value="published">Опубликовано</option>
          <option value="draft">Черновик</option>
        </Select>
      </div>

      <Textarea name="description" label="Описание" rows={5} defaultValue={initialData?.description ?? ''} />

      <div>
        <p className="text-sm text-espresso">Характеристики</p>
        <div className="mt-2 flex flex-col gap-2">
          {specs.map((spec, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="spec_key"
                placeholder="Размеры"
                value={spec.key}
                onChange={(e) => {
                  const next = [...specs];
                  next[i] = { ...next[i], key: e.target.value };
                  setSpecs(next);
                }}
                className="w-1/3 rounded border border-stone bg-canvas px-3 py-2 text-sm"
              />
              <input
                name="spec_value"
                placeholder="220 × 95 × 85 см"
                value={spec.value}
                onChange={(e) => {
                  const next = [...specs];
                  next[i] = { ...next[i], value: e.target.value };
                  setSpecs(next);
                }}
                className="flex-1 rounded border border-stone bg-canvas px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setSpecs(specs.filter((_, idx) => idx !== i))}
                className="px-2 text-sm text-stone hover:text-red-700"
                aria-label="Удалить характеристику"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSpecs([...specs, { key: '', value: '' }])}
            className="mt-1 self-start text-sm text-walnut hover:text-walnutDark"
          >
            Добавить характеристику
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_featured" defaultChecked={initialData?.is_featured} className="h-4 w-4" />
          Показывать в «Избранных работах» на главной
        </label>
        <Input
          name="sort_order"
          type="number"
          label="Порядок"
          defaultValue={initialData?.sort_order ?? 0}
          className="w-24"
        />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton label={submitLabel} />
        {state && !state.success && <FormStatus state={{ status: 'error', message: state.message }} />}
        {state && state.success && !redirectOnSuccess && (
          <FormStatus state={{ status: 'success', message: state.message }} />
        )}
      </div>
    </form>
  );
}
