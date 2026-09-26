import type { Category, CategoryWithChildren } from '@/types/domain';

/**
 * Группирует плоский список категорий (как он приходит из getCategories() —
 * родители и подкатегории вперемешку, различаются только parent_id) в дерево
 * "родитель + его подкатегории", отсортированное по sort_order.
 *
 * Категория с parent_id, который в списке не найден (не должно происходить
 * в норме, но данные могут быть в переходном состоянии) — трактуется как
 * категория верхнего уровня, чтобы не потерять её из вида молча.
 */
export function groupCategoriesByParent(categories: Category[]): CategoryWithChildren[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const childrenByParent = new Map<string, Category[]>();
  const topLevel: Category[] = [];

  for (const category of categories) {
    if (category.parent_id && byId.has(category.parent_id)) {
      const list = childrenByParent.get(category.parent_id) ?? [];
      list.push(category);
      childrenByParent.set(category.parent_id, list);
    } else {
      topLevel.push(category);
    }
  }

  return topLevel
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((parent) => ({
      ...parent,
      children: (childrenByParent.get(parent.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    }));
}
