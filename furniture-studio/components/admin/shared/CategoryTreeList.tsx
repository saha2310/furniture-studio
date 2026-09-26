import type { Category, CategoryWithChildren } from '@/types/domain';

// Иконки уровня иерархии: звезда — категория верхнего уровня, ромб — её
// подкатегория (с отступом и вертикальной линией-«веткой» слева, как на
// референсе). Закрашенная фигура = категория выбрана, контурная = нет.
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} aria-hidden="true" className="shrink-0">
      <path d="M12 2.5 15 9.3 22.3 10 16.9 14.9 18.5 22 12 18.2 5.5 22 7.1 14.9 1.7 10 9 9.3Z" strokeLinejoin="round" />
    </svg>
  );
}

function DiamondIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} aria-hidden="true" className="shrink-0">
      <path d="M12 2 22 12 12 22 2 12Z" strokeLinejoin="round" />
    </svg>
  );
}

// Один пункт дерева (родитель ИЛИ подкатегория) — общий кусок разметки, чтобы
// звезда/ромб, отступ, жирность текста и hover были одинаковыми в обеих
// реализациях (multi-select в форме работы, single-select в фильтре списка).
export function CategoryTreeRow({
  category,
  level,
  selected,
  onSelect,
  trailing,
}: {
  // Только эти два поля реально используются здесь — так строку можно
  // отрисовать и для настоящей категории, и для синтетического пункта
  // «Все категории» в фильтре, не подделывая остальные поля Category.
  category: Pick<Category, 'id' | 'name'>;
  level: 0 | 1;
  selected: boolean;
  onSelect: () => void;
  // Доп. контролы справа от названия — например, чекбокс «дополнительная»
  // или отметка «основная» в форме работы. В простом фильтре не нужен.
  trailing?: React.ReactNode;
}) {
  return (
    <div className={`relative flex items-center gap-2.5 py-1.5 ${level === 1 ? 'pl-6' : 'pl-1'}`}>
      {level === 1 && (
        <span className="absolute bottom-1/2 left-[9px] top-0 w-px bg-ink/15" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors hover:text-ink ${
          selected ? 'text-ink' : 'text-ink/60'
        }`}
      >
        {level === 0 ? <StarIcon filled={selected} /> : <DiamondIcon filled={selected} />}
        <span className={`truncate text-sm ${level === 0 ? (selected ? 'font-semibold' : 'font-medium') : ''}`}>{category.name}</span>
      </button>
      {trailing}
    </div>
  );
}

// Дерево целиком: список родителей, под каждым — его подкатегории. Пункт
// показывается, если он сам подходит под поиск, ИЛИ подходит его родитель /
// хотя бы одна из его подкатегорий — так пара «родитель → подкатегория»
// никогда не рвётся пополам.
export function CategoryTreeSearch(tree: CategoryWithChildren[], query: string): CategoryWithChildren[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tree;
  return tree
    .map((parent) => {
      const parentMatches = parent.name.toLowerCase().includes(normalized);
      const matchingChildren = parent.children.filter((child) => child.name.toLowerCase().includes(normalized));
      if (!parentMatches && matchingChildren.length === 0) return null;
      return { ...parent, children: parentMatches ? parent.children : matchingChildren };
    })
    .filter((parent): parent is CategoryWithChildren => parent !== null);
}
