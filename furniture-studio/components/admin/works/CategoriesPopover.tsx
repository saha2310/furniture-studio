'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createCategory } from '@/lib/actions/categories';
import { slugify } from '@/lib/utils/slug';
import { groupCategoriesByParent } from '@/lib/utils/categoryTree';
import { CategoryTreeRow, CategoryTreeSearch } from '@/components/admin/shared/CategoryTreeList';
import type { Category } from '@/types/domain';

// Компактный редактор категорий работы: вместо постоянно видимого выпадающего
// списка чекбоксов (как раньше в <details>) — попап по клику на уже выбранные
// категории, с поиском и инлайн-созданием новой. Модель данных не меняется:
// одна основная категория (category_id, обязательна) + произвольное число
// дополнительных (extraCategoryIds, work_categories) — так же, как было.
export function CategoriesPopover({
  categories,
  categoryId,
  extraCategoryIds,
  onPrimaryChange,
  onToggleExtra,
  onCategoryCreated,
}: {
  categories: Category[];
  categoryId: string;
  extraCategoryIds: string[];
  onPrimaryChange: (id: string) => void;
  onToggleExtra: (id: string) => void;
  onCategoryCreated: (category: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  const primary = categories.find((c) => c.id === categoryId);
  const extra = extraCategoryIds.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => !!c);
  const tree = useMemo(() => groupCategoriesByParent(categories), [categories]);
  const filteredTree = useMemo(() => CategoryTreeSearch(tree, query), [tree, query]);

  async function submitNewCategory() {
    const name = newName.trim();
    if (!name) { setCreateError('Введите название категории.'); return; }
    setCreating(true);
    setCreateError(null);
    const formData = new FormData();
    formData.set('name', name);
    formData.set('slug', slugify(name));
    formData.set('sort_order', String(categories.length));
    const result = await createCategory(null, formData);
    setCreating(false);
    if (!result.success || !result.id) { setCreateError(result.message); return; }
    // Категория, созданная отсюда (быстрое создание из формы работы), всегда
    // верхнего уровня — этот попап не предлагает выбрать родителя, поэтому
    // parent_id честно null. show_on_home берём с тем же дефолтом, что и
    // сама колонка в БД (см. 0012_category_show_on_home.sql).
    const created: Category = { id: result.id, name, slug: slugify(name), sort_order: categories.length, created_at: new Date().toISOString(), image_path: null, image_original_path: null, parent_id: null, show_on_home: true };
    onCategoryCreated(created);
    // Новая категория сразу становится основной, если основная ещё не
    // выбрана (например, для новой работы), иначе — дополнительной.
    if (!categoryId) onPrimaryChange(created.id); else onToggleExtra(created.id);
    setNewName('');
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group inline-flex items-center gap-1.5 border-b border-dashed border-ink/25 pb-0.5 text-left text-sm text-espresso transition hover:border-ink/45 hover:text-ink"
      >
        <span>
          {primary ? primary.name : <span className="text-danger/70">Категория не выбрана</span>}
          {extra.length > 0 && <span className="text-ink/35"> · {extra.map((c) => c.name).join(' · ')}</span>}
        </span>
        <span className="text-[11px] text-ink/45 transition group-hover:text-ink/80" aria-hidden="true">✎</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="false" aria-labelledby={titleId} className="absolute left-0 top-full z-40 mt-2 w-80 border border-ink/15 bg-surface p-3 shadow-2xl">
          <p id={titleId} className="mb-2 text-[10px] uppercase tracking-[0.12em] text-ink/40">Категории</p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Поиск категории…"
            className="mb-2 h-10 w-full border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
          />
          <div className="max-h-64 overflow-y-auto">
            {filteredTree.length === 0 && <p className="px-1 py-3 text-xs text-ink/40">Ничего не найдено.</p>}
            {filteredTree.map((parent, index) => {
              // Клик по звезде/ромбу — тот же переключатель «дополнительная»,
              // что раньше был на чекбоксе (isPrimary || isExtra ⇒ заполнена).
              // Отдельная точка справа — как и раньше, единственный способ
              // назначить категорию основной.
              const parentIsPrimary = parent.id === categoryId;
              const parentIsExtra = extraCategoryIds.includes(parent.id);
              return (
                <div key={parent.id} className={index > 0 ? 'mt-3' : ''}>
                  <CategoryTreeRow
                    category={parent}
                    level={0}
                    selected={parentIsPrimary || parentIsExtra}
                    // Основную категорию снять кликом по звезде нельзя — как и
                    // раньше, чекбокс был disabled для неё; менять основную
                    // можно только через отдельную точку.
                    onSelect={() => { if (!parentIsPrimary) onToggleExtra(parent.id); }}
                    trailing={
                      <button
                        type="button"
                        title="Сделать основной категорией"
                        onClick={() => onPrimaryChange(parent.id)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${parentIsPrimary ? 'border-ink bg-ink' : 'border-ink/25'}`}
                        aria-pressed={parentIsPrimary}
                      >
                        {parentIsPrimary && <span className="h-1.5 w-1.5 rounded-full bg-canvas" />}
                      </button>
                    }
                  />
                  {parent.children.map((child) => {
                    const childIsPrimary = child.id === categoryId;
                    const childIsExtra = extraCategoryIds.includes(child.id);
                    return (
                      <CategoryTreeRow
                        key={child.id}
                        category={child}
                        level={1}
                        selected={childIsPrimary || childIsExtra}
                        onSelect={() => { if (!childIsPrimary) onToggleExtra(child.id); }}
                        trailing={
                          <button
                            type="button"
                            title="Сделать основной категорией"
                            onClick={() => onPrimaryChange(child.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${childIsPrimary ? 'border-ink bg-ink' : 'border-ink/25'}`}
                            aria-pressed={childIsPrimary}
                          >
                            {childIsPrimary && <span className="h-1.5 w-1.5 rounded-full bg-canvas" />}
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-ink/30">● — основная категория (одна). Закрашенная звезда/ромб — дополнительная.</p>

          <div className="mt-3 border-t border-ink/10 pt-3">
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitNewCategory(); } }}
                placeholder="Название новой категории"
                className="h-9 min-w-0 flex-1 border border-ink/15 bg-transparent px-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
              />
              <button type="button" disabled={creating} onClick={() => void submitNewCategory()} className="h-9 shrink-0 border border-ink/15 px-3 text-[10px] uppercase tracking-[0.1em] text-ink/70 hover:border-ink/40 hover:text-ink disabled:opacity-40">
                {creating ? '…' : '+ Создать'}
              </button>
            </div>
            {createError && <p role="alert" className="mt-1.5 text-xs text-danger">{createError}</p>}
          </div>

          <div className="mt-3 flex justify-end border-t border-ink/10 pt-3">
            <button type="button" onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-[0.12em] text-ink/50 hover:text-ink">Готово</button>
          </div>
        </div>
      )}
    </div>
  );
}
