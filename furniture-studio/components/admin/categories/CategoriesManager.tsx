'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createCategory, updateCategory, deleteCategory, toggleCategoryShowOnHome } from '@/lib/actions/categories';
import { Input } from '@/components/ui/Input';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { SingleImageField } from '@/components/admin/shared/SingleImageField';
import { workImageUrl } from '@/lib/utils/image';
import { slugify } from '@/lib/utils/slug';
import type { Category } from '@/types/domain';
import { AdminSection } from '@/components/admin/shared/AdminSection';

function Submit({ label, busy }: { label: string; busy?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || busy} className="min-h-11 border border-ink/15 bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-canvas hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-45">{pending ? 'Сохранение…' : label}</button>;
}

function Fields({
  values,
  controlled = false,
  onName,
  onSlug,
  topLevelCategories,
  excludeCategoryId,
  showParentField = true,
}: {
  values: { name: string; slug: string; sort: number; parentId: string };
  controlled?: boolean;
  onName?: (value: string) => void;
  onSlug?: (value: string) => void;
  // Категории верхнего уровня, доступные в качестве родителя. Иерархия
  // двухуровневая, поэтому в списке — только категории без своего родителя.
  topLevelCategories: Category[];
  // При редактировании категория не может быть родителем сама себе.
  excludeCategoryId?: string;
  // Форма создания (и категории верхнего уровня, и подкатегории) не
  // показывает select — родитель либо отсутствует (обычная категория,
  // кнопка «+ Добавить категорию»), либо уже зафиксирован тем, в чьём
  // аккордеоне нажали «+ Добавить подкатегорию». Открытый выбор родителя
  // нужен только при редактировании уже существующей записи — например,
  // чтобы перенести подкатегорию к другому родителю.
  showParentField?: boolean;
}) {
  const parentOptions = topLevelCategories.filter((c) => c.id !== excludeCategoryId);
  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr),120px]">
      <Input name="name" label="Название" required value={controlled ? values.name : undefined} defaultValue={controlled ? undefined : values.name} onChange={controlled ? (e) => onName?.(e.target.value) : undefined} />
      <Input name="slug" label="Адрес страницы (URL)" required value={controlled ? values.slug : undefined} defaultValue={controlled ? undefined : values.slug} onChange={controlled ? (e) => onSlug?.(e.target.value) : undefined} />
      <Input name="sort_order" type="number" label="Порядок" defaultValue={values.sort} />
    </div>
    {showParentField ? (
      <label className="block text-xs text-ink/70">
        Родительская категория
        <select name="parent_id" defaultValue={values.parentId} className="mt-1 block w-full min-h-11 border border-ink/15 bg-canvas px-3 text-sm text-ink">
          <option value="">— нет, это категория верхнего уровня —</option>
          {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="mt-1 block text-[11px] text-ink/40">Выберите, если это подвид другой категории (например, «Угловые» внутри «Диванов»). Подвиды выбираются в окне — на главной у родительской плитки и в фильтре каталога /works. У подвида нет собственного изображения: если сделать категорию подвидом, её изображение будет удалено.</span>
      </label>
    ) : (
      <input type="hidden" name="parent_id" value={values.parentId} />
    )}
  </div>;
}

function NewCategoryForm() {
  const [state, formAction] = useFormState(createCategory, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  // Пока «сырой» оригинал изображения категории ещё грузится в Storage
  // напрямую из браузера (см. SingleImageField), блокируем сохранение —
  // иначе форма может уйти раньше, чем путь к оригиналу будет готов.
  const [imageBusy, setImageBusy] = useState(false);

  return <AdminSection title="Добавить категорию" description="Новое направление верхнего уровня появится в фильтрах и на сайте. Подкатегории добавляются кнопкой «+» внутри уже созданной категории ниже." defaultOpen>
    <form action={formAction} className="space-y-5">
      <Fields controlled values={{ name, slug, sort: 0, parentId: '' }} onName={(value) => { setName(value); if (!touched) setSlug(slugify(value)); }} onSlug={(value) => { setTouched(true); setSlug(value); }} topLevelCategories={[]} showParentField={false} />
      <SingleImageField fieldName="category_image" label="Изображение категории" help="Изображение используется в карточке категории. Перед сохранением можно выбрать пропорцию, масштаб и положение кадра." cropRatio={4 / 3} compact onBusyChange={setImageBusy} />
      <div className="flex flex-wrap items-center gap-3"><Submit label="Добавить категорию" busy={imageBusy} />{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
    </form>
  </AdminSection>;
}

// Форма добавления подкатегории — та же Fields, но с зафиксированным
// parentId (скрытым полем) и без своего select: подкатегорию всегда
// создают из аккордеона конкретного родителя, менять его на лету незачем.
function NewSubcategoryForm({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const [state, formAction] = useFormState(createCategory, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);

  return <form action={formAction} className="mt-3 space-y-5 border border-ink/10 bg-canvas p-4 sm:p-5">
    <Fields controlled values={{ name, slug, sort: 0, parentId }} onName={(value) => { setName(value); if (!touched) setSlug(slugify(value)); }} onSlug={(value) => { setTouched(true); setSlug(value); }} topLevelCategories={[]} showParentField={false} />
    <div className="flex flex-wrap items-center gap-3">
      <Submit label="Добавить подкатегорию" />
      <button type="button" onClick={onDone} className="min-h-11 border border-ink/10 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-ink/55 hover:text-ink">Отмена</button>
      {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
    </div>
  </form>;
}

// Переключатель «На главной» в шапке аккордеона — мгновенный, отдельный от
// формы редактирования (см. комментарий у toggleCategoryShowOnHome в
// lib/actions/categories.ts про то, почему это не часть общей формы).
// Оптимистично меняет состояние сразу, откатывает при ошибке сервера.
function HomeToggle({ categoryId, initial }: { categoryId: string; initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: boolean) {
    setError(null);
    setChecked(next);
    startTransition(async () => {
      const result = await toggleCategoryShowOnHome(categoryId, next);
      if (!result.success) { setChecked(!next); setError(result.message); }
    });
  }

  return (
    <label
      className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-ink/55 sm:text-[11px]"
      onClick={(event) => event.stopPropagation()}
      title={error ?? 'Показывать плиткой в блоке «Что мы создаём» на главной'}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(event) => handleChange(event.target.checked)}
        className="h-4 w-4 accent-[rgb(var(--color-ink))] disabled:opacity-50"
      />
      <span className={error ? 'text-danger' : undefined}>На главной</span>
    </label>
  );
}

function CategoryAccordion({
  category,
  topLevelCategories,
  isChild = false,
  children,
}: {
  category: Category;
  topLevelCategories: Category[];
  isChild?: boolean;
  // Вложенные аккордеоны подкатегорий — рендерятся только у категорий
  // верхнего уровня, у самих подкатегорий вложенности больше нет
  // (иерархия двухуровневая, см. 0011_category_subcategories.sql).
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [state, formAction] = useFormState(updateCategory.bind(null, category.id), null);
  const [imageBusy, setImageBusy] = useState(false);

  return (
    <div className={`border-b border-ink/10 last:border-0 ${isChild ? 'bg-surface/60' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink/[0.02] sm:gap-4 sm:px-5 sm:py-4 ${isChild ? 'pl-9 sm:pl-12' : ''}`}
      >
        {/* У подкатегорий изображения нет — миниатюра только у категорий верхнего уровня. */}
        {!isChild && (
          <div className="h-12 w-16 shrink-0 overflow-hidden bg-black sm:h-14 sm:w-20">
            {category.image_path ? <img src={workImageUrl(category.image_path)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.1em] text-ink/30">Нет фото</div>}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {isChild && <p className="text-[9px] uppercase tracking-[0.14em] text-ink/35">Подкатегория</p>}
          <p className="truncate text-sm text-ink sm:text-base">{category.name}</p>
          <p className="truncate text-xs text-ink/40">/{category.slug}</p>
        </div>
        {/* Тумблер только у категорий верхнего уровня — подкатегория не
            рендерится отдельной плиткой на главной, только в модалке
            родителя, так что переключать ей нечего (см. 0012 миграцию). */}
        {!isChild && <HomeToggle categoryId={category.id} initial={category.show_on_home} />}
        <span className="shrink-0 text-ink/45" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className={`border-t border-ink/10 px-4 py-5 sm:px-5 sm:py-6 ${isChild ? 'pl-9 sm:pl-12' : ''}`}>
          {editing ? (
            <form action={formAction} className="space-y-5">
              <Fields values={{ name: category.name, slug: category.slug, sort: category.sort_order, parentId: category.parent_id ?? '' }} topLevelCategories={topLevelCategories} excludeCategoryId={category.id} />
              {!isChild && <SingleImageField fieldName="category_image" existingPath={category.image_path} existingOriginalPath={category.image_original_path} label="Изображение категории" help="Изменения текста и изображения сохраняются одной кнопкой ниже." cropRatio={4 / 3} compact onBusyChange={setImageBusy} />}
              <div className="flex flex-wrap items-center gap-3">
                <Submit label="Сохранить изменения" busy={imageBusy} />
                <button type="button" onClick={() => setEditing(false)} className="min-h-11 border border-ink/10 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-ink/55 hover:text-ink">Отмена</button>
                {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => setEditing(true)} className="text-xs uppercase tracking-[0.12em] text-ink/75 hover:text-ink">Изменить</button>
              <ConfirmDialog triggerLabel="Удалить" title={`Удалить категорию «${category.name}»?`} description="Удалить можно только категорию без работ и без подкатегорий." onConfirm={() => deleteCategory(category.id)} />
            </div>
          )}

          {!isChild && (
            <div className="mt-6 border-t border-ink/10 pt-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-ink/40">Подкатегории</p>
              {children}
              {addingChild
                ? <NewSubcategoryForm parentId={category.id} onDone={() => setAddingChild(false)} />
                : <button type="button" onClick={() => setAddingChild(true)} className="min-h-11 w-full border border-dashed border-ink/20 text-xs uppercase tracking-[0.12em] text-ink/55 hover:border-ink/40 hover:text-ink">+ Добавить подкатегорию</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c);
    childrenByParent.set(c.parent_id, list);
  }
  // Категории-сироты (родитель был удалён вне UI/через RLS-редактируемый
  // клиент) на всякий случай тоже показываем — иначе они бы просто пропали
  // из списка, оставаясь при этом в БД.
  const existingIds = new Set(categories.map((c) => c.id));
  const orphans = categories.filter((c) => c.parent_id && !existingIds.has(c.parent_id));

  return <div className="space-y-5">
    <NewCategoryForm />
    <section className="border border-ink/10 bg-surface">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-6"><div><p className="text-sm text-ink">Существующие категории</p><p className="mt-1 text-xs text-ink/40">{categories.length} шт. ({topLevel.length} верхнего уровня)</p></div></div>
      {categories.length === 0 ? <p className="p-8 text-center text-sm text-ink/45">Категорий пока нет.</p> : (
        <>
          {topLevel.map((category) => (
            <CategoryAccordion key={category.id} category={category} topLevelCategories={topLevel}>
              {(childrenByParent.get(category.id) ?? []).map((child) => (
                <CategoryAccordion key={child.id} category={child} topLevelCategories={topLevel} isChild />
              ))}
            </CategoryAccordion>
          ))}
          {orphans.map((category) => <CategoryAccordion key={category.id} category={category} topLevelCategories={topLevel} isChild />)}
        </>
      )}
    </section>
  </div>;
}
