'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { groupCategoriesByParent } from '@/lib/utils/categoryTree';
import { CategoryTreeRow, CategoryTreeSearch } from '@/components/admin/shared/CategoryTreeList';
import type { Category } from '@/types/domain';

// Тот же вид дерева (звезда/ромб), что и в CategoriesPopover формы работы, но
// в режиме одиночного выбора — без «основной/дополнительной», просто одна
// выбранная категория для фильтра списка (или ничего — «Все категории»).
export function CategoryFilterPopover({
  categories,
  selectedId,
  onChange,
}: {
  categories: Category[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

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

  const tree = useMemo(() => groupCategoriesByParent(categories), [categories]);
  const filteredTree = useMemo(() => CategoryTreeSearch(tree, query), [tree, query]);
  const selected = categories.find((c) => c.id === selectedId) ?? null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-9 items-center gap-1.5 border border-ink/10 bg-canvas px-3 text-sm text-ink"
      >
        <span className="truncate">{selected ? selected.name : 'Все категории'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0 text-ink/45">
          <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-modal="false" className="absolute left-0 top-full z-40 mt-2 w-72 border border-ink/15 bg-surface p-3 shadow-2xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Поиск категории…"
            className="mb-2 h-10 w-full border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
          />
          <div className="max-h-64 overflow-y-auto">
            <CategoryTreeRow
              category={{ id: '__all__', name: 'Все категории' }}
              level={0}
              selected={!selectedId}
              onSelect={() => { onChange(null); setOpen(false); }}
            />
            {filteredTree.length === 0 && <p className="px-1 py-3 text-xs text-ink/40">Ничего не найдено.</p>}
            {filteredTree.map((parent, index) => (
              <div key={parent.id} className={index === 0 ? 'mt-2' : 'mt-3'}>
                <CategoryTreeRow
                  category={parent}
                  level={0}
                  selected={selectedId === parent.id}
                  onSelect={() => { onChange(parent.id); setOpen(false); }}
                />
                {parent.children.map((child) => (
                  <CategoryTreeRow
                    key={child.id}
                    category={child}
                    level={1}
                    selected={selectedId === child.id}
                    onSelect={() => { onChange(child.id); setOpen(false); }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
