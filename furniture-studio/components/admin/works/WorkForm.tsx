'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { AdminSection } from '@/components/admin/shared/AdminSection';
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
  // Остальные цвета того же товара (без текущего) — рисуются вкладками
  // сверху формы. groupId — группа, к которой принадлежит/будет принадлежать
  // редактируемая запись (для нового цвета передаётся через ?group= в URL).
  colorVariants?: WorkWithUrls[];
  groupId?: string;
  prefillTitle?: string;
  prefillCategoryId?: string;
}

function SaveBarButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <SaveBar label={label} pending={pending} message={pending ? 'Изменения сохраняются. Не закрывайте страницу.' : 'Фотографии, текст и публикация сохраняются одной кнопкой.'} />;
}

function VariantTabs({
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
  // Есть смысл показывать вкладки, только если у товара уже больше одного
  // цвета, либо мы сейчас создаём цвет специально для существующей группы.
  if (siblings.length === 0 && !groupId) return null;

  const addHref = `/admin/works/new?group=${groupId ?? currentId ?? ''}&category=${categoryId ?? ''}&title=${encodeURIComponent(currentTitle)}`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border border-ink/10 bg-surface p-3">
      <span className="mr-1 text-[10px] uppercase tracking-[0.16em] text-ink/35">Цвета товара:</span>
      {currentId && (
        <span className="inline-flex items-center gap-2 border border-ink/30 bg-ink/[0.04] px-3 py-1.5 text-xs text-ink">
          <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ backgroundColor: currentColorHex || DEFAULT_SWATCH_HEX }} />
          {currentColorName || 'этот вариант'}
        </span>
      )}
      {siblings.map((sibling) => (
        <Link
          key={sibling.id}
          href={`/admin/works/${sibling.id}`}
          className="inline-flex items-center gap-2 border border-ink/10 px-3 py-1.5 text-xs text-ink/70 hover:border-ink/30 hover:text-ink"
        >
          <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ backgroundColor: sibling.color_hex || DEFAULT_SWATCH_HEX }} />
          {sibling.color_name || 'без названия'}
        </Link>
      ))}
      <Link href={addHref} className="ml-auto text-xs uppercase tracking-[0.1em] text-ink/60 hover:text-ink">+ Добавить цвет</Link>
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
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>(
    initialData?.specs ? Object.entries(initialData.specs).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]
  );
  const [colorName, setColorName] = useState(initialData?.color_name ?? '');
  const [colorHex, setColorHex] = useState(initialData?.color_hex ?? (groupId ? DEFAULT_SWATCH_HEX : ''));
  const [dirty, setDirty] = useState(false);

  const effectiveGroupId = initialData?.group_id ?? groupId;
  const isPartOfGroup = colorVariants.length > 0 || !!groupId;

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
    <form action={formAction} onChange={() => setDirty(true)} className="max-w-6xl pb-4">
      <VariantTabs
        currentId={initialData?.id}
        currentTitle={title}
        currentColorName={colorName}
        currentColorHex={colorHex}
        siblings={colorVariants}
        groupId={effectiveGroupId}
        categoryId={categoryId}
      />
      <input type="hidden" name="group_id" value={groupId ?? ''} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),260px]">
        <div className="space-y-4">
          <AdminSection title="Галерея" description="Фотографии, обложка, порядок и кадрирование." defaultOpen>
            <WorkImageEditor images={initialData?.images ?? []} coverImageId={initialData?.cover_image_id ?? null} />
          </AdminSection>

          <AdminSection title="Основная информация" description="Название, адрес страницы, категория и описание." defaultOpen>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="title" label="Название" required value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
              <div>
                <Input name="slug" label="Адрес страницы (URL)" required value={slug} onChange={(e) => { const value = e.target.value; setSlug(value); setSlugTouched(value.trim() !== ''); }} />
                <p className="mt-1.5 text-xs text-ink/35">Подставляется из названия сам. Можно писать как угодно — если такой адрес уже занят, при сохранении подберём свободный.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Select name="category_id" label="Категория" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="" disabled>Выберите категорию</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Select name="status" label="Публикация" defaultValue={initialData?.status ?? 'published'}>
                <option value="published">Опубликовано</option>
                <option value="draft">Черновик</option>
              </Select>
            </div>
            <div className="mt-5">
              <Textarea name="description" label="Описание" rows={7} defaultValue={initialData?.description ?? ''} />
            </div>
          </AdminSection>

          <AdminSection
            title="Цвет"
            description={isPartOfGroup ? 'Название и оттенок этого конкретного варианта — картинки в галерее выше должны быть в этом цвете.' : 'Если у товара будет несколько цветов, укажите его здесь — потом можно добавить ещё вариант через «+ Добавить цвет».'}
            defaultOpen
          >
            <div className="grid gap-5 sm:grid-cols-[1fr,auto]">
              <Input name="color_name" label="Название цвета" placeholder="Например, Коричневый" value={colorName} onChange={(e) => setColorName(e.target.value)} />
              <div>
                <label className="mb-1.5 block text-[13px] text-ink/60">Оттенок</label>
                <div className="flex h-11 items-center gap-2">
                  <input
                    type="color"
                    name="color_hex"
                    value={colorHex || DEFAULT_SWATCH_HEX}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-11 w-14 cursor-pointer border border-ink/10 bg-canvas p-1"
                  />
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    placeholder="#8a7b6c"
                    className="h-11 w-28 border border-ink/10 bg-canvas px-3 text-sm text-ink placeholder:text-ink/25 focus:border-ink/30"
                  />
                </div>
              </div>
            </div>
            {isPartOfGroup && (
              <label className="mt-5 flex items-start gap-3 text-sm text-ink/80">
                <input type="checkbox" name="is_primary" defaultChecked={initialData?.is_primary ?? !colorVariants.length} className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-ink">Основная карточка товара</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/40">Этот цвет будет показываться по умолчанию в каталоге /works — остальные цвета видны как переключатель.</span>
                </span>
              </label>
            )}
          </AdminSection>

          <AdminSection title="Цена" description="Укажите стоимость или выберите вариант «По договорённости»." defaultOpen>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm ${priceMode === 'fixed' ? 'border-ink/30 bg-ink/[0.04] text-ink' : 'border-ink/10 text-ink/55'}`}>
                <input type="radio" name="price_mode_picker" checked={priceMode === 'fixed'} onChange={() => setPriceMode('fixed')} className="accent-ink" /> Указать цену
              </label>
              <label className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-sm ${priceMode === 'negotiable' ? 'border-ink/30 bg-ink/[0.04] text-ink' : 'border-ink/10 text-ink/55'}`}>
                <input type="radio" name="price_mode_picker" checked={priceMode === 'negotiable'} onChange={() => setPriceMode('negotiable')} className="accent-ink" /> По договорённости
              </label>
            </div>
            <div className="mt-4 max-w-sm">
              <Input name="price" label="Цена" placeholder="Например, 125 000 ₽" defaultValue={priceMode === 'fixed' && initialData?.price && initialData.price !== 'По договорённости' ? initialData.price : ''} disabled={priceMode !== 'fixed'} />
            </div>
            <input type="hidden" name="price_mode" value={priceMode} />
          </AdminSection>

          <AdminSection title="Характеристики" description="Размеры, материалы и другие параметры проекта." defaultOpen>
            <div className="space-y-2">
              {specs.map((spec, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,.7fr),minmax(0,1.3fr),44px]">
                  <input name="spec_key" placeholder="Размеры" value={spec.key} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} className="h-11 border border-ink/10 bg-canvas px-3 text-sm text-ink placeholder:text-ink/25 focus:border-ink/30" />
                  <input name="spec_value" placeholder="220 × 95 × 85 см" value={spec.value} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} className="h-11 border border-ink/10 bg-canvas px-3 text-sm text-ink placeholder:text-ink/25 focus:border-ink/30" />
                  <button type="button" onClick={() => setSpecs((items) => items.filter((_, i) => i !== index))} className="h-11 border border-ink/10 text-ink/45 hover:border-red-300/30 hover:text-red-200" aria-label={`Удалить характеристику ${index + 1}`}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => setSpecs((items) => [...items, { key: '', value: '' }])} className="min-h-10 text-xs uppercase tracking-[0.12em] text-ink/60 hover:text-ink">+ Добавить характеристику</button>
            </div>
          </AdminSection>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <section className="border border-ink/10 bg-surface p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink/35">Публикация</p>
            <label className="mt-4 flex items-start gap-3 text-sm text-ink/80"><input type="checkbox" name="is_featured" defaultChecked={initialData?.is_featured} className="mt-1 h-4 w-4" /><span><span className="block text-ink">На главной</span><span className="mt-1 block text-xs leading-5 text-ink/40">Показывать в разделе избранных работ.</span></span></label>
            <div className="mt-5"><Input name="sort_order" type="number" label="Порядок" defaultValue={initialData?.sort_order ?? 0} /></div>
          </section>
          <div className="hidden lg:block">
            <SaveBarButton label={submitLabel} />
          </div>
        </aside>
      </div>

      <div className="mt-4 lg:hidden"><SaveBarButton label={submitLabel} /></div>
      <div className="mt-3">
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
      {dirty && <p className="mt-3 text-xs text-ink/35">Есть несохранённые изменения.</p>}
    </form>
  );
}
