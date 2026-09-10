'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { SaveBar } from '@/components/admin/shared/SaveBar';
import { slugify } from '@/lib/utils/slug';
import type { ActionResult } from '@/lib/actions/works';
import type { Category, WorkWithUrls } from '@/types/domain';
import { WorkImageEditor } from './WorkImageEditor';

const DEFAULT_SWATCH_HEX = '#8a7b6c';

interface WorkFormProps {
  categories: Category[];
  initialData?: WorkWithUrls;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  redirectToDetailOnSuccess?: boolean;
  colorVariants?: WorkWithUrls[];
  groupId?: string;
  prefillTitle?: string;
  prefillCategoryId?: string;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center border border-ink/20 bg-ink px-5 text-[10px] font-medium uppercase tracking-[0.14em] text-canvas transition hover:bg-ink/85 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'Сохранение…' : label}
    </button>
  );
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 border border-ink/10 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.12em] text-ink/60">
      <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-ink' : 'bg-ink/25'}`} />
      {published ? 'Опубликовано' : 'Черновик'}
    </span>
  );
}

function VariantBar({
  currentId,
  currentTitle,
  currentColorName,
  currentColorHex,
  siblings,
  groupId,
  categoryId,
}: {
  currentId?: string;
  currentTitle: string;
  currentColorName: string;
  currentColorHex: string;
  siblings: WorkWithUrls[];
  groupId?: string;
  categoryId?: string;
}) {
  if (siblings.length === 0 && !groupId) return null;
  const addHref = `/admin/works/new?group=${groupId ?? currentId ?? ''}&category=${categoryId ?? ''}&title=${encodeURIComponent(currentTitle)}`;
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto border-b border-ink/10 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="mr-2 shrink-0 text-[9px] uppercase tracking-[0.16em] text-ink/35">Варианты</span>
      {currentId && (
        <span className="inline-flex h-8 shrink-0 items-center gap-2 border border-ink/25 bg-ink/[0.04] px-3 text-xs text-ink">
          <span className="h-3 w-3 rounded-full border border-ink/15" style={{ backgroundColor: currentColorHex || DEFAULT_SWATCH_HEX }} />
          {currentColorName || 'Текущий'}
        </span>
      )}
      {siblings.map((sibling) => (
        <Link key={sibling.id} href={`/admin/works/${sibling.id}`} className="inline-flex h-8 shrink-0 items-center gap-2 border border-ink/10 px-3 text-xs text-ink/55 transition hover:border-ink/25 hover:text-ink">
          <span className="h-3 w-3 rounded-full border border-ink/15" style={{ backgroundColor: sibling.color_hex || DEFAULT_SWATCH_HEX }} />
          {sibling.color_name || 'Без названия'}
        </Link>
      ))}
      <Link href={addHref} className="ml-auto shrink-0 px-2 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">+ Новый цвет</Link>
    </div>
  );
}

export function WorkForm({ categories, initialData, action, submitLabel, redirectToDetailOnSuccess, colorVariants = [], groupId, prefillTitle, prefillCategoryId }: WorkFormProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);
  const [title, setTitle] = useState(initialData?.title ?? prefillTitle ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? (prefillTitle ? slugify(prefillTitle) : ''));
  const [slugTouched, setSlugTouched] = useState(!!initialData);
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? prefillCategoryId ?? '');
  const [priceMode, setPriceMode] = useState(initialData?.price === 'По договорённости' || !initialData?.price ? 'negotiable' : 'fixed');
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>(initialData?.specs ? Object.entries(initialData.specs).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]);
  const [colorName, setColorName] = useState(initialData?.color_name ?? '');
  const [colorHex, setColorHex] = useState(initialData?.color_hex ?? (groupId ? DEFAULT_SWATCH_HEX : ''));
  const [dirty, setDirty] = useState(false);
  const effectiveGroupId = initialData?.group_id ?? groupId;
  const isPartOfGroup = colorVariants.length > 0 || !!groupId;
  const heroImage = initialData?.images?.find((image) => image.id === initialData.cover_image_id)?.url ?? initialData?.images?.[0]?.url;
  const published = initialData?.status !== 'draft';

  useEffect(() => {
    if (state?.success) {
      setDirty(false);
      if (redirectToDetailOnSuccess && state.id) router.push(`/admin/works/${state.id}`);
    }
  }, [state, redirectToDetailOnSuccess, router]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="pb-24">
      <input type="hidden" name="group_id" value={groupId ?? ''} />

      <div className="mb-5 flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-ink/35">
            <Link href="/admin/works" className="hover:text-ink">Работы</Link><span>/</span><span>Редактирование</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl tracking-[-0.025em] text-ink sm:text-3xl">{title || 'Новая работа'}</h1>
            <StatusPill published={published} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {initialData?.slug && <Link href={`/works/${initialData.slug}`} target="_blank" className="hidden h-11 items-center border border-ink/10 px-4 text-[9px] uppercase tracking-[0.14em] text-ink/55 transition hover:border-ink/25 hover:text-ink sm:inline-flex">Предпросмотр ↗</Link>}
          <SaveButton label={submitLabel} />
        </div>
      </div>

      <VariantBar currentId={initialData?.id} currentTitle={title} currentColorName={colorName} currentColorHex={colorHex} siblings={colorVariants} groupId={effectiveGroupId} categoryId={categoryId} />

      <div className="mt-5 grid gap-7 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="eyebrow">01 / Галерея</p><h2 className="mt-1 text-lg text-ink">Фотографии работы</h2></div>
              <span className="hidden text-[10px] text-ink/35 sm:block">Обложка · порядок · кадрирование</span>
            </div>
            {heroImage && (
              <div className="relative mb-2 aspect-[16/8] overflow-hidden bg-surface">
                <Image src={heroImage} alt={initialData?.title ?? ''} fill sizes="(min-width:1280px) 70vw, 100vw" className="object-cover" priority />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent p-4 pt-12 text-white">
                  <div><span className="text-[9px] uppercase tracking-[0.15em] text-white/65">Обложка проекта</span><p className="mt-1 text-sm">{title || 'Изображение работы'}</p></div>
                  <span className="border border-white/20 bg-black/25 px-2 py-1 text-[9px]">{initialData?.images?.length ?? 0} фото</span>
                </div>
              </div>
            )}
            <WorkImageEditor images={initialData?.images ?? []} coverImageId={initialData?.cover_image_id ?? null} />
          </section>

          <section className="border-t border-ink/10 pt-7">
            <div className="mb-5"><p className="eyebrow">02 / Контент</p><h2 className="mt-1 text-lg text-ink">Основная информация</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="title" label="Название" required value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
              <Input name="slug" label="URL / slug" required value={slug} onChange={(e) => { const value = e.target.value; setSlug(value); setSlugTouched(value.trim() !== ''); }} />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Select name="category_id" label="Категория" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="" disabled>Выберите категорию</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Select name="status" label="Статус" defaultValue={initialData?.status ?? 'published'}>
                <option value="published">Опубликовано</option><option value="draft">Черновик</option>
              </Select>
            </div>
            <div className="mt-5"><Textarea name="description" label="Описание" rows={7} defaultValue={initialData?.description ?? ''} /></div>
          </section>

          <section className="border-t border-ink/10 pt-7">
            <div className="mb-5"><p className="eyebrow">03 / Цвет</p><h2 className="mt-1 text-lg text-ink">Цветовой вариант</h2></div>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_190px]">
              <Input name="color_name" label="Название цвета" placeholder="Например, Мокко" value={colorName} onChange={(e) => setColorName(e.target.value)} />
              <div><label className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-espresso">Оттенок</label><div className="flex h-12 gap-2"><input type="color" name="color_hex" value={colorHex || DEFAULT_SWATCH_HEX} onChange={(e) => setColorHex(e.target.value)} className="h-12 w-14 cursor-pointer border border-ink/10 bg-canvas p-1" /><input type="text" value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#8a7b6c" className="h-12 min-w-0 flex-1 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-stone focus:border-ink/45" /></div></div>
            </div>
            {isPartOfGroup && <label className="mt-5 flex items-start gap-3 border-t border-ink/10 pt-5 text-sm text-ink/75"><input type="checkbox" name="is_primary" defaultChecked={initialData?.is_primary ?? !colorVariants.length} className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-ink))]" /><span><span className="block text-ink">Основной вариант</span><span className="mt-1 block text-xs leading-5 text-ink/40">Используется по умолчанию в каталоге.</span></span></label>}
          </section>

          <section className="border-t border-ink/10 pt-7">
            <div className="mb-5"><p className="eyebrow">04 / Стоимость</p><h2 className="mt-1 text-lg text-ink">Цена</h2></div>
            <div className="grid max-w-xl gap-2 sm:grid-cols-2">
              <label className={`flex h-12 cursor-pointer items-center gap-3 border px-4 text-sm transition ${priceMode === 'fixed' ? 'border-ink/30 bg-ink/[0.04] text-ink' : 'border-ink/10 text-ink/55'}`}><input type="radio" name="price_mode_picker" checked={priceMode === 'fixed'} onChange={() => setPriceMode('fixed')} className="accent-[rgb(var(--color-ink))]" /> Указать цену</label>
              <label className={`flex h-12 cursor-pointer items-center gap-3 border px-4 text-sm transition ${priceMode === 'negotiable' ? 'border-ink/30 bg-ink/[0.04] text-ink' : 'border-ink/10 text-ink/55'}`}><input type="radio" name="price_mode_picker" checked={priceMode === 'negotiable'} onChange={() => setPriceMode('negotiable')} className="accent-[rgb(var(--color-ink))]" /> По договорённости</label>
            </div>
            <div className="mt-4 max-w-sm"><Input name="price" label="Цена" placeholder="125 000 ₽" defaultValue={priceMode === 'fixed' && initialData?.price && initialData.price !== 'По договорённости' ? initialData.price : ''} disabled={priceMode !== 'fixed'} /></div>
            <input type="hidden" name="price_mode" value={priceMode} />
          </section>

          <section className="border-t border-ink/10 pt-7">
            <div className="mb-5"><p className="eyebrow">05 / Характеристики</p><h2 className="mt-1 text-lg text-ink">Параметры проекта</h2></div>
            <div className="space-y-2">
              {specs.map((spec, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_40px]"><input name="spec_key" placeholder="Размеры" value={spec.key} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} className="h-11 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-stone focus:border-ink/45" /><input name="spec_value" placeholder="220 × 95 × 85 см" value={spec.value} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} className="h-11 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-stone focus:border-ink/45" /><button type="button" onClick={() => setSpecs((items) => items.filter((_, i) => i !== index))} className="h-11 border border-ink/10 text-ink/40 hover:border-ink/25 hover:text-ink" aria-label={`Удалить характеристику ${index + 1}`}>×</button></div>)}
              <button type="button" onClick={() => setSpecs((items) => [...items, { key: '', value: '' }])} className="pt-2 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">+ Добавить характеристику</button>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="border border-ink/10 bg-surface p-5">
            <div className="flex items-center justify-between"><p className="eyebrow">Публикация</p><StatusPill published={published} /></div>
            <label className="mt-5 flex items-start gap-3 border-t border-ink/10 pt-5 text-sm text-ink/75"><input type="checkbox" name="is_featured" defaultChecked={initialData?.is_featured} className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-ink))]" /><span><span className="block text-ink">Показывать на главной</span><span className="mt-1 block text-xs leading-5 text-ink/40">Добавить работу в избранные проекты.</span></span></label>
            <div className="mt-5 border-t border-ink/10 pt-5"><Input name="sort_order" type="number" label="Порядок сортировки" defaultValue={initialData?.sort_order ?? 0} /></div>
          </section>
          <section className="border-t border-ink/10 pt-5"><p className="eyebrow">Быстрые действия</p><div className="mt-3 space-y-1"><Link href="/admin/works" className="flex h-10 items-center justify-between px-2 text-sm text-ink/55 hover:bg-ink/[0.03] hover:text-ink">Вернуться к работам <span>←</span></Link>{initialData?.slug && <Link href={`/works/${initialData.slug}`} target="_blank" className="flex h-10 items-center justify-between px-2 text-sm text-ink/55 hover:bg-ink/[0.03] hover:text-ink">Открыть на сайте <span>↗</span></Link>}</div></section>
        </aside>
      </div>

      <div className="mt-8 border-t border-ink/10 pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div>{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}{dirty && !state?.success && <p className="mt-2 text-xs text-ink/35">Есть несохранённые изменения.</p>}</div><div className="sm:hidden"><SaveButton label={submitLabel} /></div></div></div>
      <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-ink/10 bg-canvas/90 px-4 py-3 backdrop-blur md:block"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><p className="text-xs text-ink/45">{dirty ? 'Изменения ещё не сохранены' : 'Все изменения сохранены'}</p><div className="flex items-center gap-2"><Link href="/admin/works" className="h-11 px-4 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">Отмена</Link><SaveButton label={submitLabel} /></div></div></div>
    </form>
  );
}
