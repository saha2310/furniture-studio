'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createCategoryQuick, deleteCategory, renameCategory, toggleCategoryShowOnHome } from '@/lib/actions/categories';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { workImageUrl } from '@/lib/utils/image';
import type { Category } from '@/types/domain';
import { CategoryImageControl } from './CategoryImageControl';
import { useAutosavedText, useSaveStatus, type SaveStatus, type Track } from './autosave';

// «1 подкатегория», «2 подкатегории», «5 подкатегорий», «21 подкатегория».
function subcategoriesLabel(count: number) {
  if (count === 0) return 'нет подкатегорий';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} подкатегория`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} подкатегории`;
  return `${count} подкатегорий`;
}

function SaveStatusText({ status }: { status: SaveStatus }) {
  return (
    <p aria-live="polite" className={`min-w-0 text-xs leading-5 ${status.kind === 'error' ? 'text-danger' : 'text-ink/40'}`}>
      {status.kind === 'idle' && 'Изменения сохраняются автоматически'}
      {status.kind === 'saving' && 'Сохраняем…'}
      {status.kind === 'saved' && '✓ Сохранено'}
      {status.kind === 'error' && status.message}
    </p>
  );
}

// Переключатель «На главной» — сохраняется мгновенно; при ошибке возвращается
// в прежнее положение, а сообщение показывает карточка (см. track).
function HomeSwitch({ categoryId, initial, track }: { categoryId: string; initial: boolean; track: Track }) {
  const [checked, setChecked] = useState(initial);
  useEffect(() => { setChecked(initial); }, [initial]);

  async function change() {
    const next = !checked;
    setChecked(next);
    const result = await track(() => toggleCategoryShowOnHome(categoryId, next));
    if (!result.success) setChecked(!next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => void change()}
      title="Показывать плиткой в блоке «Что мы создаём» на главной"
      className="flex shrink-0 items-center gap-2 py-1 text-[10px] uppercase tracking-[0.1em] text-ink/55 hover:text-ink sm:text-[11px]"
    >
      <span>На главной</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-ink/20'}`} aria-hidden="true">
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-canvas transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

// Подкатегория — «таблетка» с названием, которое правится прямо в ней, и
// крестиком удаления. Удалить можно только пустую подкатегорию (без работ):
// иначе сервер откажет, и причина появится внизу карточки.
function SubcategoryChip({
  child,
  track,
  shouldFocus,
  onFocused,
}: {
  child: Category;
  track: Track;
  shouldFocus: boolean;
  onFocused: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const text = useAutosavedText({ serverValue: child.name, save: (name) => track(() => renameCategory(child.id, name)) });

  useEffect(() => {
    if (!shouldFocus) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    onFocused();
  }, [shouldFocus, onFocused]);

  async function remove() {
    setRemoving(true);
    try {
      await track(() => deleteCategory(child.id));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className={`inline-flex h-10 items-center rounded-full border border-ink/15 bg-canvas pl-4 pr-1.5 transition-colors focus-within:border-ink/40 ${removing ? 'opacity-50' : ''}`}>
      <input
        ref={inputRef}
        value={text.value}
        onChange={(e) => text.onChange(e.target.value)}
        onBlur={text.onBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        maxLength={60}
        size={Math.min(Math.max(text.value.length, 4), 28)}
        aria-label="Название подкатегории"
        className="min-w-0 bg-transparent text-sm text-ink outline-none"
      />
      <button
        type="button"
        onClick={() => void remove()}
        disabled={removing}
        aria-label={`Удалить подкатегорию «${child.name}»`}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-base leading-none text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink disabled:pointer-events-none"
      >
        ×
      </button>
    </div>
  );
}

function CategoryCard({ category, subcategories, isFresh }: { category: Category; subcategories: Category[]; isFresh: boolean }) {
  const [open, setOpen] = useState(false);
  const [focusChildId, setFocusChildId] = useState<string | null>(null);
  const [addingChild, setAddingChild] = useState(false);
  const { status, track } = useSaveStatus();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const handledFresh = useRef(false);
  const nameId = useId();
  const panelId = useId();

  const name = useAutosavedText({ serverValue: category.name, save: (value) => track(() => renameCategory(category.id, value)) });

  // Только что созданная категория сразу раскрывается, а её название
  // выделяется — остаётся ввести своё.
  useEffect(() => {
    if (isFresh && !handledFresh.current) { handledFresh.current = true; setOpen(true); }
  }, [isFresh]);
  useEffect(() => {
    if (open && isFresh && nameInputRef.current && !nameInputRef.current.dataset.focused) {
      nameInputRef.current.dataset.focused = '1';
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [open, isFresh]);

  const clearFocusChild = useCallback(() => setFocusChildId(null), []);

  async function addChild() {
    setAddingChild(true);
    try {
      const result = await track(() => createCategoryQuick(category.id));
      if (result.success && result.id) setFocusChildId(result.id);
    } finally {
      setAddingChild(false);
    }
  }

  return (
    <section className="rounded-3xl border border-ink/10 bg-surface">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
          <span className="block h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas sm:h-14 sm:w-20">
            {category.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workImageUrl(category.image_path)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-[8px] uppercase tracking-[0.1em] text-ink/30">Нет фото</span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-ink sm:text-base">{category.name}</span>
            <span className={`block truncate text-xs ${!open && status.kind === 'error' ? 'text-danger' : 'text-ink/40'}`}>
              {!open && status.kind === 'error' ? status.message : subcategoriesLabel(subcategories.length)}
            </span>
          </span>
        </button>
        <HomeSwitch categoryId={category.id} initial={category.show_on_home} track={track} />
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen((v) => !v)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/45 hover:bg-ink/5 hover:text-ink">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div id={panelId} className="space-y-7 border-t border-ink/10 px-4 py-6 sm:px-6 sm:py-7">
          <CategoryImageControl categoryId={category.id} imagePath={category.image_path} originalPath={category.image_original_path} track={track} />

          <div>
            <label htmlFor={nameId} className="block text-[11px] uppercase tracking-[0.12em] text-ink/50">Название категории</label>
            <input
              id={nameId}
              ref={nameInputRef}
              value={name.value}
              onChange={(e) => name.onChange(e.target.value)}
              onBlur={name.onBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              maxLength={60}
              className="mt-2 h-12 w-full rounded-full border border-ink/15 bg-canvas px-5 text-sm text-ink transition-colors placeholder:text-stone focus:border-ink/45"
            />
            {name.hint && <p role="alert" className="mt-2 px-2 text-xs text-danger">{name.hint}</p>}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink/50">Подкатегории</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {subcategories.map((child) => (
                <SubcategoryChip key={child.id} child={child} track={track} shouldFocus={focusChildId === child.id} onFocused={clearFocusChild} />
              ))}
              <button
                type="button"
                onClick={() => void addChild()}
                disabled={addingChild}
                aria-label="Добавить подкатегорию"
                title="Добавить подкатегорию"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-ink/25 text-lg leading-none text-ink/55 transition-colors hover:border-ink/50 hover:text-ink disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5">
            <SaveStatusText status={status} />
            <ConfirmDialog
              triggerLabel="Удалить категорию"
              title={`Удалить категорию «${category.name}»?`}
              description="Удалить можно только категорию без работ и без подкатегорий."
              onConfirm={() => deleteCategory(category.id)}
              triggerClassName="rounded-full border border-danger/30 px-5 py-2.5 text-[13px] text-danger transition-colors hover:bg-danger/10"
            />
          </div>
        </div>
      )}
    </section>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [freshId, setFreshId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parent_id) continue;
    const list = childrenByParent.get(c.parent_id) ?? [];
    list.push(c);
    childrenByParent.set(c.parent_id, list);
  }

  async function addCategory() {
    setAdding(true);
    setAddError(null);
    try {
      const result = await createCategoryQuick(null);
      if (result.success && result.id) setFreshId(result.id);
      else setAddError(result.message);
    } catch {
      setAddError('Не удалось создать категорию. Проверьте соединение и повторите.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-3">
      {topLevel.length === 0 && <p className="rounded-3xl border border-ink/10 bg-surface p-8 text-center text-sm text-ink/45">Категорий пока нет.</p>}
      {topLevel.map((category) => (
        <CategoryCard key={category.id} category={category} subcategories={childrenByParent.get(category.id) ?? []} isFresh={category.id === freshId} />
      ))}
      <button
        type="button"
        onClick={() => void addCategory()}
        disabled={adding}
        className="w-full rounded-3xl border border-dashed border-ink/20 px-5 py-4 text-sm text-ink/55 transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
      >
        {adding ? 'Создаём…' : '+ Добавить категорию'}
      </button>
      {addError && <p role="alert" className="px-2 text-xs text-danger">{addError}</p>}
    </div>
  );
}
