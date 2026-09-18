'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { slugify } from '@/lib/utils/slug';
import { deleteWork, detachWorkFromGroup, attachWorkToGroup, moveWorkToGroup, type ActionResult } from '@/lib/actions/works';
import type { Category, WorkWithUrls } from '@/types/domain';
import { WorkImageEditor } from './WorkImageEditor';
import { CategoriesPopover } from './CategoriesPopover';

const DEFAULT_SWATCH_HEX = '#8a7b6c';

// Уже использованный где-то цвет — для быстрого выбора вместо повторного
// подбора hex вручную (см. getUsedColorsAdmin).
interface UsedColor {
  name: string;
  hex: string;
}

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
  // Товары, у которых есть хотя бы одна общая категория с текущим и которые
  // ещё не привязаны ни к одной группе цветов — кандидаты для «+ Существующий
  // товар». Только для редактирования: при создании нового товара прикреплять
  // пока нечего.
  attachCandidates?: WorkWithUrls[];
  // Цвета, уже встречавшиеся у других товаров — для подсказки-выбора рядом
  // с полями «Название цвета» / «Оттенок».
  usedColors?: UsedColor[];
}

// Компактная квадратная кнопка-плюс — общий вид для «+ Новый цвет» и
// «+ Существующий товар» над формой. Раньше это были просто текстовые
// ссылки вплотную друг к другу — легко было промахнуться и не сразу понятно,
// что это два разных, кликабельных действия. Квадрат с иконкой и подписью
// снизу — тот же язык, что у остальных мелких управляющих элементов формы
// (аптайм-регистр, крошечный кегль), но с явной кликабельной областью.
function AddSquareButton({
  label,
  title,
  onClick,
  href,
}: {
  label: string;
  title: string;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    'group flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 border border-dashed border-ink/20 text-ink/45 transition hover:border-ink/45 hover:text-ink';
  const content = (
    <>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span className="text-center text-[7px] uppercase leading-tight tracking-[0.08em]">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} title={title} aria-label={title} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} className={className}>
      {content}
    </button>
  );
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
function categoryIdsOverlap(left: string[], right: string[]) {
  const set = new Set(left);
  return right.some((id) => set.has(id));
}

function AttachExistingModal({ groupId, candidates, categories, currentCategoryIds, onClose }: { groupId: string; candidates: WorkWithUrls[]; categories: Category[]; currentCategoryIds: string[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorFilterRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (colorFilterRef.current && !colorFilterRef.current.contains(event.target as Node)) setColorOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pendingId) onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); document.removeEventListener('pointerdown', onPointerDown); };
  }, [onClose, pendingId]);

  const availableCategories = categories;
  const availableColors = Array.from(new Map(
    candidates
      .filter((c) => c.color_name || c.color_hex)
      .map((c) => [`${c.color_name ?? ''}|${c.color_hex ?? ''}`, { name: c.color_name || 'Без названия', hex: c.color_hex || DEFAULT_SWATCH_HEX }])
  ).values());

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = candidates.filter((c) => {
    const categoryIds = [c.category_id, ...(c.extraCategoryIds ?? [])];
    if (categoryFilter && !categoryIds.includes(categoryFilter)) return false;
    if (colorFilter && `${c.color_name ?? ''}|${c.color_hex ?? ''}` !== colorFilter) return false;
    if (!normalizedQuery) return true;
    return c.title.toLowerCase().includes(normalizedQuery) || (c.color_name ?? '').toLowerCase().includes(normalizedQuery);
  });

  async function handleAttach(id: string, moveExisting = false) {
    setPendingId(id);
    setError(null);
    const result = moveExisting ? await moveWorkToGroup(id, groupId) : await attachWorkToGroup(id, groupId);
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
            <p className="mt-1 text-xs leading-5 text-ink/40">Показаны все работы. Фильтры помогают найти нужную, а статус рядом объясняет, можно ли привязать её к текущей группе.</p>
          </div>
          <button type="button" onClick={onClose} disabled={!!pendingId} className="shrink-0 text-2xl leading-none text-ink/50 hover:text-ink disabled:opacity-40" aria-label="Закрыть">×</button>
        </div>

        <div className="grid gap-2 border-b border-ink/10 p-4 sm:grid-cols-[minmax(0,1fr),180px,180px]">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название или название цвета…" className="h-11 min-w-0 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-11 min-w-0 border border-ink/15 bg-transparent px-3 text-sm text-ink focus:border-ink/40">
            <option value="">Все категории</option>
            {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div ref={colorFilterRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => setColorOpen((value) => !value)}
              className="flex h-11 w-full items-center gap-2 border border-ink/15 bg-transparent px-3 text-left text-sm text-ink hover:border-ink/30 focus:border-ink/40"
              aria-expanded={colorOpen}
              aria-haspopup="listbox"
            >
              <span
                className="h-4 w-4 shrink-0 border border-ink/20"
                style={{ backgroundColor: colorFilter ? (availableColors.find((color) => `${color.name === 'Без названия' ? '' : color.name}|${color.hex}` === colorFilter)?.hex ?? DEFAULT_SWATCH_HEX) : 'transparent' }}
              />
              <span className="min-w-0 flex-1 truncate">
                {colorFilter ? (availableColors.find((color) => `${color.name === 'Без названия' ? '' : color.name}|${color.hex}` === colorFilter)?.name ?? 'Цвет') : 'Все цвета'}
              </span>
              <span className="text-[10px] text-ink/35">⌄</span>
            </button>
            {colorOpen && (
              <div role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto border border-ink/10 bg-surface p-1 shadow-xl">
                <button type="button" role="option" aria-selected={!colorFilter} onClick={() => { setColorFilter(''); setColorOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-ink/5">
                  <span className="h-4 w-4 shrink-0 border border-dashed border-ink/25" />
                  <span>Все цвета</span>
                </button>
                {availableColors.map((color) => {
                  const value = `${color.name === 'Без названия' ? '' : color.name}|${color.hex}`;
                  return (
                    <button key={value} type="button" role="option" aria-selected={colorFilter === value} onClick={() => { setColorFilter(value); setColorOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-ink/5">
                      <span className="h-5 w-5 shrink-0 border border-ink/20" style={{ backgroundColor: color.hex || DEFAULT_SWATCH_HEX }} />
                      <span className="min-w-0 flex-1 truncate">{color.name}</span>
                      {color.hex && <span className="shrink-0 text-[9px] uppercase tracking-[0.08em] text-ink/30">{color.hex}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink/40">
              {candidates.length === 0 ? 'Нет работ для поиска.' : 'Ничего не найдено. Попробуйте другой запрос или снимите фильтр категории.'}
            </p>
          ) : (
            <ul>
              {filtered.map((c) => {
                const cover = c.coverImage?.url ?? c.images?.[0]?.url;
                const isPending = pendingId === c.id;
                const isCurrentGroup = c.group_id === groupId;
                const isOtherGroup = !isCurrentGroup && c.group_id !== c.id;
                const hasCategoryOverlap = categoryIdsOverlap(currentCategoryIds, [c.category_id, ...(c.extraCategoryIds ?? [])]);
                const noCommonCategory = !isCurrentGroup && !isOtherGroup && !hasCategoryOverlap;
                const unavailable = isCurrentGroup || isOtherGroup || noCommonCategory;
                const status = isCurrentGroup ? 'Уже в этой группе' : isOtherGroup ? 'Уже в другой группе цветов' : noCommonCategory ? 'Нет общей категории' : null;
                return (
                  <li key={c.id}>
                    <div className="flex w-full items-center gap-3 px-3 py-2 transition hover:bg-ink/5">
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
                          {c.color_name || 'Без названия цвета'} · {c.category?.name ?? 'Без категории'}{c.status === 'draft' ? ' · Черновик' : ''}
                        </span>
                      </span>
                      <span className="shrink-0">
                        {isPending ? (
                          <span className="text-[10px] text-ink/40">Сохраняем…</span>
                        ) : isOtherGroup ? (
                          <button type="button" disabled={!!pendingId || noCommonCategory} onClick={() => handleAttach(c.id, true)} className="border border-ink/15 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.08em] text-ink/65 hover:border-ink/40 hover:text-ink disabled:opacity-40">Открепить и привязать</button>
                        ) : unavailable ? (
                          <span className="max-w-[150px] text-right text-[9px] uppercase tracking-[0.08em] text-ink/35">{status}</span>
                        ) : (
                          <button type="button" disabled={!!pendingId} onClick={() => handleAttach(c.id)} className="border border-ink/15 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.08em] text-ink/65 hover:border-ink/40 hover:text-ink disabled:opacity-40">Привязать</button>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p role="alert" className="mx-3 mt-2 border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">{error}</p>}
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
function AttachExistingPicker({ groupId, candidates, categories, currentCategoryIds }: { groupId: string; candidates: WorkWithUrls[]; categories: Category[]; currentCategoryIds: string[] }) {
  const [open, setOpen] = useState(false);

  if (candidates.length === 0) return null;

  return (
    <>
      <AddSquareButton label="Товар" title="Привязать существующий товар как цвет" onClick={() => setOpen(true)} />
      {open && <AttachExistingModal groupId={groupId} candidates={candidates} categories={categories} currentCategoryIds={currentCategoryIds} onClose={() => setOpen(false)} />}
    </>
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
  extraCategoryIds = [],
  attachCandidates = [],
  categories = [],
}: {
  currentId?: string;
  currentTitle: string;
  currentColorName: string;
  currentColorHex: string;
  siblings: WorkWithUrls[];
  groupId?: string;
  categoryId?: string;
  extraCategoryIds?: string[];
  attachCandidates?: WorkWithUrls[];
  categories?: Category[];
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
                  triggerClassName="flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-ink/40 hover:bg-danger/10 hover:text-danger"
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
              triggerClassName="flex h-5 w-5 items-center justify-center rounded-full text-sm leading-none text-ink/30 hover:bg-danger/10 hover:text-danger"
            />
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-l border-ink/10 pl-3">
        <AddSquareButton label="Цвет" title="Добавить новый цвет этого товара" href={addHref} />
        {groupId && <AttachExistingPicker groupId={groupId} candidates={attachCandidates} categories={categories} currentCategoryIds={[categoryId ?? '', ...extraCategoryIds].filter(Boolean)} />}
      </div>
    </div>
  );
}

export function WorkForm({ categories, initialData, action, submitLabel, redirectToDetailOnSuccess, colorVariants = [], groupId, prefillTitle, prefillCategoryId, attachCandidates = [], usedColors = [] }: WorkFormProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);
  const [title, setTitle] = useState(initialData?.title ?? prefillTitle ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? (prefillTitle ? slugify(prefillTitle) : ''));
  const [slugTouched, setSlugTouched] = useState(!!initialData);
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? prefillCategoryId ?? '');
  // Дополнительные категории (галочки, помимо основной category_id выше) —
  // см. work_categories / 0007_work_categories.sql.
  const [extraCategoryIds, setExtraCategoryIds] = useState<string[]>(initialData?.extraCategoryIds ?? []);
  // Локальная копия списка категорий: попап выбора категорий (см.
  // CategoriesPopover) умеет создавать новую категорию инлайн, не уходя со
  // страницы работы — сразу после создания она должна появиться в списке,
  // не дожидаясь перезагрузки/ревалидации всей страницы.
  const [localCategories, setLocalCategories] = useState(categories);
  // Второстепенные настройки (показ на главной, порядок) — раньше висели
  // отдельным блоком прямо в основном контенте; убраны в компактное меню
  // «⋯» у панели сверху, чтобы не отвлекать от структуры, повторяющей
  // публичную страницу работы (см. пункт 16 в обсуждении редизайна).
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [categoryMissing, setCategoryMissing] = useState(false);
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

  // Категория не может одновременно быть и основной, и «дополнительной» —
  // если админ переключил основную категорию на ту, что уже была отмечена
  // галочкой ниже, снимаем галочку молча (сервер и так проигнорировал бы
  // дубль, но в списке чекбоксов оставлять «фантомную» отметку не нужно —
  // она относится к пункту, которого там уже не будет).
  function handleCategoryIdChange(nextId: string) {
    setCategoryId(nextId);
    setExtraCategoryIds((ids) => ids.filter((id) => id !== nextId));
    if (nextId) setCategoryMissing(false);
  }

  function toggleExtraCategory(id: string) {
    setExtraCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function applyUsedColor(color: UsedColor) {
    setColorName(color.name);
    setColorHex(color.hex);
  }

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
    if (!moreOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') setMoreOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [moreOpen]);

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
        if (imagesUploading) { event.preventDefault(); return; }
        // category_id теперь скрытое поле (управляется попапом категорий, а
        // не <select required>) — required на input[type=hidden] браузеры
        // могут просто игнорировать (или того хуже, заблокировать сабмит без
        // видимой подсказки, где именно проблема). Проверяем сами и, если
        // категория не выбрана, не уходим на сервер — сервер всё равно бы
        // отклонил с тем же сообщением, но только после round-trip.
        if (!categoryId) { event.preventDefault(); setCategoryMissing(true); return; }
      }}
      className="pb-24"
    >
      <input type="hidden" name="group_id" value={groupId ?? ''} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/works" className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink/40 hover:text-ink">← Работы</Link>
          <span className="hidden shrink-0 text-ink/15 sm:inline">/</span>
          <span className="hidden truncate text-sm text-ink/60 sm:inline">{title || 'Новая работа'}</span>
          <StatusPill published={published} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {initialData?.slug && <Link href={`/works/${initialData.slug}`} target="_blank" className="hidden h-10 items-center border border-ink/10 px-3.5 text-[10px] uppercase tracking-[0.12em] text-ink/55 transition hover:border-ink/25 hover:text-ink sm:inline-flex">Предпросмотр ↗</Link>}
          <div ref={moreRef} className="relative">
            <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-label="Дополнительные настройки" className="flex h-10 w-10 items-center justify-center border border-ink/10 text-ink/50 hover:border-ink/25 hover:text-ink">⋯</button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 border border-ink/15 bg-surface p-3 shadow-2xl">
                <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-ink/35">Дополнительные настройки</p>
                <label className="flex items-center gap-2.5 py-1.5 text-sm text-ink/75">
                  <input type="checkbox" name="is_featured" defaultChecked={initialData?.is_featured} className="h-4 w-4 accent-[rgb(var(--color-ink))]" />
                  Показывать на главной
                </label>
                <div className="flex items-center justify-between gap-2 py-1.5">
                  <label htmlFor="sort_order" className="text-sm text-ink/75">Порядок сортировки</label>
                  <input id="sort_order" name="sort_order" type="number" defaultValue={initialData?.sort_order ?? 0} className="h-9 w-16 border border-ink/15 bg-transparent px-2 text-sm text-ink focus:border-ink/40" />
                </div>
                <div className="mt-2 border-t border-ink/10 pt-2">
                  <Select name="status" label="Статус" defaultValue={initialData?.status ?? 'published'}>
                    <option value="published">Опубликовано</option><option value="draft">Черновик</option>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Дальше структура намеренно повторяет публичную страницу работы
          (app/(public)/works/[slug]/page.tsx): галерея слева, карточка с
          названием/категорией/цветом/ценой/описанием справа — вместо
          пронумерованных секций классической CMS-формы. Все поля — это
          обычные input/textarea, попадающие в ту же FormData, что и раньше;
          изменилась только раскладка и стилизация. */}
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1.05fr)]">
        <div className="order-1 min-w-0">
          <p className="eyebrow mb-3">фотографии</p>
          {heroImage && (
            <div className="relative mb-2 aspect-[4/3] overflow-hidden bg-surface">
              <Image src={heroImage} alt={initialData?.title ?? ''} fill sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" priority />
            </div>
          )}
          <WorkImageEditor key={saveVersion} images={initialData?.images ?? []} coverImageId={initialData?.cover_image_id ?? null} workId={initialData?.id ?? null} onBusyChange={setImagesUploading} onDirty={() => setDirty(true)} />
        </div>

        <div className="order-2 min-w-0">
          <p className="eyebrow">проект</p>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
            placeholder="Название работы"
            aria-label="Название работы"
            className="display-title mt-3 w-full border-0 bg-transparent p-0 text-ink outline-none placeholder:text-ink/25 focus:outline-none"
            style={{ fontSize: 'clamp(1.9rem, 3vw, 2.8rem)' }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <CategoriesPopover
              categories={localCategories}
              categoryId={categoryId}
              extraCategoryIds={extraCategoryIds}
              onPrimaryChange={handleCategoryIdChange}
              onToggleExtra={toggleExtraCategory}
              onCategoryCreated={(category) => setLocalCategories((items) => [...items, category])}
            />
          </div>
          {/* Скрытые поля — попап управляет только React-состоянием, в
              FormData категории попадают так же, как раньше от <select>/чекбоксов. */}
          <input type="hidden" name="category_id" value={categoryId} />
          {extraCategoryIds.map((id) => <input key={id} type="hidden" name="category_ids" value={id} />)}
          {categoryMissing && !categoryId && <p role="alert" className="mt-1.5 text-xs text-danger">Выберите категорию — без неё работу нельзя сохранить.</p>}

          <div className="mt-4 flex items-center gap-2 text-xs text-ink/35">
            <span>/works/</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => { const value = e.target.value; setSlug(value); setSlugTouched(value.trim() !== ''); }}
              aria-label="URL / slug"
              className="min-w-0 flex-1 border-0 border-b border-dashed border-ink/15 bg-transparent p-0 text-ink/60 outline-none focus:border-ink/40"
            />
          </div>

          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-3">цвет{colorName ? `: ${colorName}` : ''}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="fabric-swatch" style={{ '--swatch-color': colorHex || DEFAULT_SWATCH_HEX } as React.CSSProperties} title={colorName || 'Цвет'} />
              <details className="group">
                <summary className="list-none text-xs text-ink/50 underline decoration-ink/20 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">Изменить цвет</summary>
                <div className="mt-3 grid max-w-sm gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Input name="color_name" label="Название цвета" placeholder="Например, Мокко" value={colorName} onChange={(e) => setColorName(e.target.value)} />
                  <div><label className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-espresso">Оттенок</label><div className="flex h-12 gap-2"><input type="color" name="color_hex" value={colorHex || DEFAULT_SWATCH_HEX} onChange={(e) => setColorHex(e.target.value)} className="h-12 w-12 cursor-pointer border border-ink/10 bg-canvas p-1" /><input type="text" value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#8a7b6c" className="h-12 min-w-0 flex-1 border border-ink/15 bg-transparent px-2.5 text-xs text-ink placeholder:text-stone focus:border-ink/45" /></div></div>
                </div>
                {usedColors.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-ink/35">Уже использовались</p>
                    <div className="flex flex-wrap gap-2">
                      {usedColors.map((color) => (
                        <button key={color.hex} type="button" onClick={() => applyUsedColor(color)} title={color.name} className="fabric-swatch h-6 w-6" style={{ '--swatch-color': color.hex } as React.CSSProperties} />
                      ))}
                    </div>
                  </div>
                )}
                {isPartOfGroup && <label className="mt-4 flex items-start gap-2.5 text-xs text-ink/60"><input type="checkbox" name="is_primary" defaultChecked={initialData?.is_primary ?? !colorVariants.length} className="mt-0.5 h-3.5 w-3.5 accent-[rgb(var(--color-ink))]" /><span>Основной вариант — используется по умолчанию в каталоге.</span></label>}
              </details>
            </div>
          </div>

          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-3">цена</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-ink/70"><input type="radio" name="price_mode_picker" checked={priceMode === 'negotiable'} onChange={() => setPriceMode('negotiable')} className="accent-[rgb(var(--color-ink))]" /> По договорённости</label>
              <label className="flex cursor-pointer items-center gap-2 text-ink/70"><input type="radio" name="price_mode_picker" checked={priceMode === 'fixed'} onChange={() => setPriceMode('fixed')} className="accent-[rgb(var(--color-ink))]" /> Указать цену</label>
            </div>
            {priceMode === 'fixed' && (
              <input
                name="price"
                placeholder="125 000 ₽"
                defaultValue={initialData?.price && initialData.price !== 'По договорённости' ? initialData.price : ''}
                aria-label="Цена"
                className="mt-3 w-48 border-0 border-b border-ink/15 bg-transparent p-0 pb-1 text-lg text-ink outline-none placeholder:text-ink/25 focus:border-ink/40"
              />
            )}
            <input type="hidden" name="price_mode" value={priceMode} />
          </div>

          <div className="mt-7 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-3">описание</p>
            <textarea
              name="description"
              aria-label="Описание"
              rows={6}
              defaultValue={initialData?.description ?? ''}
              placeholder="Добавьте описание работы"
              className="w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 text-espresso outline-none placeholder:text-ink/30"
            />
          </div>
        </div>

        <div className="order-3 col-span-full">
          <div className="mb-4 flex items-end justify-between gap-4 border-t border-ink/10 pt-7">
            <p className="eyebrow">характеристики</p>
            <button type="button" onClick={() => setSpecs((items) => [...items, { key: '', value: '' }])} className="text-[10px] uppercase tracking-[0.12em] text-ink/50 hover:text-ink">+ Добавить характеристику</button>
          </div>
          {specs.length === 0 && <p className="pb-3 text-sm italic text-ink/30">Характеристик пока нет. Добавьте первую.</p>}
          <dl>
            {specs.map((spec, index) => (
              <div key={index} className="group grid grid-cols-[.75fr,1.25fr,28px] items-center gap-3 border-b border-ink/10 py-2.5 sm:grid-cols-[.75fr,1.25fr,28px]">
                <input name="spec_key" placeholder="Размеры" value={spec.key} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} className="min-w-0 border-0 bg-transparent p-0 text-[10px] uppercase tracking-[0.14em] text-stone outline-none placeholder:text-stone/50 focus:text-ink" aria-label={`Название характеристики ${index + 1}`} />
                <input name="spec_value" placeholder="220 × 95 × 85 см" value={spec.value} onChange={(e) => setSpecs((items) => items.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} className="min-w-0 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink/25" aria-label={`Значение характеристики ${index + 1}`} />
                <button type="button" onClick={() => setSpecs((items) => items.filter((_, i) => i !== index))} className="justify-self-end text-ink/25 opacity-0 transition group-hover:opacity-100 hover:text-danger" aria-label={`Удалить характеристику ${index + 1}`}>×</button>
              </div>
            ))}
          </dl>
        </div>

        <div className="order-4 col-span-full border-t border-ink/10 pt-7">
          <p className="eyebrow mb-4">варианты этой модели</p>
          <VariantBar categories={categories} currentId={initialData?.id} currentTitle={title} currentColorName={colorName} currentColorHex={colorHex} siblings={colorVariants} groupId={effectiveGroupId} categoryId={categoryId} extraCategoryIds={extraCategoryIds} attachCandidates={attachCandidates} />
        </div>
      </div>

      <div className="mt-8 border-t border-ink/10 pt-4">{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}{imagesUploading && <p className="mt-2 text-xs text-ink/45">Дождитесь загрузки фотографий, затем нажмите «Сохранить».</p>}{!imagesUploading && dirty && !state?.success && <p className="mt-2 text-xs text-ink/35">Есть несохранённые изменения.</p>}</div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-canvas/90 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><p className="hidden truncate text-xs text-ink/45 sm:block">{imagesUploading ? 'Загружаем фотографии…' : dirty ? 'Изменения ещё не сохранены' : 'Все изменения сохранены'}</p><div className="ml-auto flex items-center gap-2"><Link href="/admin/works" className="h-11 px-4 text-[9px] uppercase tracking-[0.14em] text-ink/50 hover:text-ink">Отмена</Link><SaveButton label={submitLabel} busy={imagesUploading} /></div></div></div>
    </form>
  );
}
