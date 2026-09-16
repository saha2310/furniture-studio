'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { slugify } from '@/lib/utils/slug';
import { deleteWork, detachWorkFromGroup, attachWorkToGroup, type ActionResult } from '@/lib/actions/works';
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
  // Самостоятельные товары той же категории, ещё не привязанные ни к одной
  // группе цветов — кандидаты для «+ Существующий товар». Только для
  // редактирования: при создании нового товара прикреплять пока нечего.
  attachCandidates?: WorkWithUrls[];
}

function SaveButton({ label, busy }: { label: string; busy?: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || busy;
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center border border-ink/20 bg-ink px-5 text-[10px] font-medium uppercase tracking-[0.14em] text-canvas transition hover:bg-ink/85 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? 'Сохранение…' : busy ? 'Загрузка фото…' : label}
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

// Полноэкранная модалка выбора кандидата — открывается поверх всей страницы
// (fixed inset-0), поэтому не может быть обрезана горизонтальным скроллом
// VariantBar, как было со старым absolute-дропдауном. Паттерн модалки —
// как в MediaLibraryPicker (Escape/клик по фону закрывает, блокировка
// прокрутки body), для визуальной и поведенческой консистентности админки.
function AttachExistingModal({ groupId, candidates, onClose }: { groupId: string; candidates: WorkWithUrls[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pendingId) onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [onClose, pendingId]);

  const filtered = candidates.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()));

  async function handleAttach(id: string) {
    setPendingId(id);
    setError(null);
    const result = await attachWorkToGroup(id, groupId);
    setPendingId(null);
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !pendingId) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[85vh] w-full max-w-lg flex-col border border-ink/10 bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 p-5">
          <div>
            <h2 id={titleId} className="text-lg text-ink">Привязать существующий товар</h2>
            <p className="mt-1 text-xs leading-5 text-ink/40">Товар станет цветовым вариантом этой группы. Показаны только товары той же категории, ещё не привязанные к другой группе цветов.</p>
          </div>
          <button type="button" onClick={onClose} disabled={!!pendingId} className="shrink-0 text-2xl leading-none text-ink/50 hover:text-ink disabled:opacity-40" aria-label="Закрыть">×</button>
        </div>

        <div className="border-b border-ink/10 p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию…"
            className="h-11 w-full border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink/40">
              {candidates.length === 0 ? 'Нет свободных товаров этой категории — все либо уже входят в группы цветов, либо это единственный товар в категории.' : 'Ничего не найдено.'}
            </p>
          ) : (
            <ul>
              {filtered.map((c) => {
                const cover = c.coverImage?.url ?? c.images?.[0]?.url;
                const isPending = pendingId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!!pendingId}
                      onClick={() => handleAttach(c.id)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-ink/5 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden border border-ink/10 bg-canvas">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[9px] text-ink/25">нет фото</span>
                        )}
                      </span>
                      <span className="h-3 w-3 shrink-0 rounded-full border border-ink/15" style={{ backgroundColor: c.color_hex || DEFAULT_SWATCH_HEX }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{c.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.1em] text-ink/35">
                          {c.color_name || 'Без названия цвета'}{c.status === 'draft' ? ' · Черновик' : ''}
                        </span>
                      </span>
                      {isPending && <span className="shrink-0 text-[10px] text-ink/40">Привязываем…</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p role="alert" className="mx-3 mt-2 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs leading-5 text-red-200">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// «+ Существующий товар» — обратная операция к «Открепить»: берёт уже
// созданный самостоятельный товар (никому пока не приходится удалять и
// пересоздавать, если цвет по ошибке успели сохранить отдельной карточкой)
// и делает его цветовым вариантом текущей группы через attachWorkToGroup.
// Список кандидатов открывается полноэкранной модалкой (AttachExistingModal)
// поверх всей страницы, а не выпадашкой рядом с кнопкой — раньше дропдаун
// был вложен в горизонтально скроллящийся VariantBar и обрезался им.
function AttachExistingPicker({ groupId, candidates }: { groupId: string; candidates: WorkWithUrls[] }) {
  const [open, setOpen] = useState(false);

  if (candidates.length === 0) return null;

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap px-1 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink"
      >
        + Существующий товар
      </button>
      {open && <AttachExistingModal groupId={groupId} candidates={candidates} onClose={() => setOpen(false)} />}
    </div>
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
  attachCandidates = [],
}: {
  currentId?: string;
  currentTitle: string;
  currentColorName: string;
  currentColorHex: string;
  siblings: WorkWithUrls[];
  groupId?: string;
  categoryId?: string;
  attachCandidates?: WorkWithUrls[];
}) {
  const router = useRouter();
  if (siblings.length === 0 && !groupId) return null;
  const addHref = `/admin/works/new?group=${groupId ?? currentId ?? ''}&category=${categoryId ?? ''}&title=${encodeURIComponent(currentTitle)}`;

  // Раньше единственным действием на цветовом чипе было полное удаление
  // товара (deleteWork) — из-за чего "убрать цвет" на деле стирало и сам
  // товар, и его фотографии. Теперь два разных действия:
  //  - «Открепить» (detachWorkFromGroup) — товар остаётся, просто перестаёт
  //    считаться цветовым вариантом этой группы и становится отдельной
  //    карточкой со своими фото;
  //  - «Удалить» (deleteWork) — как и раньше, стирает товар целиком.
  async function handleDetachSibling(id: string) {
    const result = await detachWorkFromGroup(id);
    if (result.success) router.refresh();
    return result;
  }

  async function handleDeleteSibling(id: string) {
    const result = await deleteWork(id);
    if (result.success) router.refresh();
    return result;
  }

  async function handleDetachCurrent() {
    if (!currentId) return { success: false, message: 'Товар не найден.' };
    const result = await detachWorkFromGroup(currentId);
    if (result.success) router.refresh();
    return result;
  }

  async function handleDeleteCurrent() {
    if (!currentId) return { success: false, message: 'Товар не найден.' };
    const result = await deleteWork(currentId);
    if (result.success) {
      const fallback = siblings[0]?.id;
      router.push(fallback ? `/admin/works/${fallback}` : '/admin/works');
    }
    return result;
  }

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-ink/10 pb-3">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-ink/35">Варианты</span>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {currentId && (
          <span className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-ink/25 bg-ink/[0.04] pl-3 pr-1.5 text-xs text-ink">
            <span className="h-3 w-3 rounded-full border border-ink/15" style={{ backgroundColor: currentColorHex || DEFAULT_SWATCH_HEX }} />
            {currentColorName || 'Текущий'}
            {siblings.length > 0 && (
              <>
                <ConfirmDialog
                  triggerLabel="⇢"
                  title="Открепить товар от группы цветов?"
                  description={`Товар «${currentTitle || currentColorName || 'без названия'}» перестанет быть цветовым вариантом и останется отдельной карточкой со своими фотографиями. Ничего не удаляется.`}
                  onConfirm={handleDetachCurrent}
                  triggerClassName="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none text-ink/40 hover:bg-ink/10 hover:text-ink"
                />
                <ConfirmDialog
                  triggerLabel="×"
                  title="Удалить товар вместе с этим цветом?"
                  description={`Товар «${currentTitle || currentColorName || 'без названия'}» и его фотографии будут удалены без возможности восстановления. Если нужно просто убрать связь с другими цветами — используйте «Открепить».`}
                  onConfirm={handleDeleteCurrent}
                  triggerClassName="flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-ink/40 hover:bg-red-300/10 hover:text-red-200"
                />
              </>
            )}
          </span>
        )}
        {siblings.map((sibling) => (
          <span key={sibling.id} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-ink/10 pl-3 pr-1.5 text-xs text-ink/55 transition hover:border-ink/25 hover:text-ink">
            <Link href={`/admin/works/${sibling.id}`} className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-ink/15" style={{ backgroundColor: sibling.color_hex || DEFAULT_SWATCH_HEX }} />
              {sibling.color_name || 'Без названия'}
            </Link>
            <ConfirmDialog
              triggerLabel="⇢"
              title="Открепить товар от группы цветов?"
              description={`Товар «${sibling.title}» перестанет быть цветовым вариантом и останется отдельной карточкой со своими фотографиями. Ничего не удаляется.`}
              onConfirm={() => handleDetachSibling(sibling.id)}
              triggerClassName="flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none text-ink/30 hover:bg-ink/10 hover:text-ink"
            />
            <ConfirmDialog
              triggerLabel="×"
              title="Удалить товар вместе с этим цветом?"
              description={`Товар «${sibling.title}» и его фотографии будут удалены без возможности восстановления. Если нужно просто убрать связь с другими цветами — используйте «Открепить».`}
              onConfirm={() => handleDeleteSibling(sibling.id)}
              triggerClassName="flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-ink/30 hover:bg-red-300/10 hover:text-red-200"
            />
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 border-l border-ink/10 pl-3">
        <Link href={addHref} className="shrink-0 whitespace-nowrap px-1 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">+ Новый цвет</Link>
        {groupId && <AttachExistingPicker groupId={groupId} candidates={attachCandidates} />}
      </div>
    </div>
  );
}

export function WorkForm({ categories, initialData, action, submitLabel, redirectToDetailOnSuccess, colorVariants = [], groupId, prefillTitle, prefillCategoryId, attachCandidates = [] }: WorkFormProps) {
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
  // Увеличивается только когда сохранение реально прошло успешно. Служит
  // ключом для WorkImageEditor (см. ниже): после успешного сохранения
  // Server Action ревалидирует эту страницу и родитель получает свежий
  // initialData.images с сервера, но сам инстанс WorkImageEditor как
  // клиентский компонент не размонтируется и молча продолжает хранить
  // старое локальное состояние (уже отправленные "новые" файлы, отметки
  // на удаление/замену). Раньше это и было причиной дублирования фото:
  // те же File-объекты оставались в скрытом input'е и на следующем
  // сохранении отправлялись повторно как "новые". Смена key заставляет
  // React полностью пересоздать компонент и инициализировать его заново
  // из уже сохранённых данных — единственных, которым можно доверять.
  const [saveVersion, setSaveVersion] = useState(0);
  // Пока фото ещё загружаются в Storage (см. WorkImageEditor.onBusyChange),
  // сохранение нужно заблокировать: иначе можно нажать «Сохранить» в момент,
  // когда путь для только что выбранного файла ещё не готов, и это фото
  // тихо не попадёт в товар.
  const [imagesUploading, setImagesUploading] = useState(false);
  const effectiveGroupId = initialData?.group_id ?? groupId;
  const isPartOfGroup = colorVariants.length > 0 || !!groupId;
  const heroImage = initialData?.images?.find((image) => image.id === initialData.cover_image_id)?.url ?? initialData?.images?.[0]?.url;
  const published = initialData?.status !== 'draft';

  useEffect(() => {
    if (state?.success) {
      setDirty(false);
      setSaveVersion((v) => v + 1);
      // Если сервер подобрал другой slug из-за коллизии (ensureUniqueSlug),
      // поле в форме должно показывать реально сохранённое значение, а не
      // то, что администратор ввёл до сохранения.
      if (state.slug) { setSlug(state.slug); setSlugTouched(true); }
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
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      onSubmit={(event) => {
        // Подстраховка на случай неявной отправки формы (Enter в текстовом
        // поле): даже если по какой-то причине кнопка не была задизейблена,
        // не даём уйти в Server Action, пока фото ещё грузятся.
        if (imagesUploading) event.preventDefault();
      }}
      className="pb-24"
    >
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
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3 border border-ink/10 bg-surface px-4 py-3">
        <label className="flex items-center gap-2.5 text-sm text-ink/75">
          <input type="checkbox" name="is_featured" defaultChecked={initialData?.is_featured} className="h-4 w-4 accent-[rgb(var(--color-ink))]" />
          Показывать на главной
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="sort_order" className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Сортировка</label>
          <input id="sort_order" name="sort_order" type="number" defaultValue={initialData?.sort_order ?? 0} className="h-9 w-20 border border-ink/15 bg-transparent px-2.5 text-sm text-ink focus:border-ink/40" />
        </div>
      </div>

      <VariantBar currentId={initialData?.id} currentTitle={title} currentColorName={colorName} currentColorHex={colorHex} siblings={colorVariants} groupId={effectiveGroupId} categoryId={categoryId} attachCandidates={attachCandidates} />

      <div className="mt-5 space-y-8">
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
          <WorkImageEditor key={saveVersion} images={initialData?.images ?? []} coverImageId={initialData?.cover_image_id ?? null} workId={initialData?.id ?? null} onBusyChange={setImagesUploading} />
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

      <div className="mt-8 border-t border-ink/10 pt-4">{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}{imagesUploading && <p className="mt-2 text-xs text-ink/45">Дождитесь загрузки фотографий, затем нажмите «Сохранить».</p>}{!imagesUploading && dirty && !state?.success && <p className="mt-2 text-xs text-ink/35">Есть несохранённые изменения.</p>}</div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-canvas/90 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><p className="hidden truncate text-xs text-ink/45 sm:block">{imagesUploading ? 'Загружаем фотографии…' : dirty ? 'Изменения ещё не сохранены' : 'Все изменения сохранены'}</p><div className="ml-auto flex items-center gap-2"><Link href="/admin/works" className="h-11 px-4 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">Отмена</Link><SaveButton label={submitLabel} busy={imagesUploading} /></div></div></div>
    </form>
  );
}
