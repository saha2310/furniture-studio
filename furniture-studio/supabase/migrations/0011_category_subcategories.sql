-- Подкатегории: у категории может быть родитель (например, «Угловые» —
-- подкатегория «Диванов»). Иерархия намеренно двухуровневая — подкатегория
-- сама не может стать родителем; это ограничение не проверяется в БД
-- (усложнять схему ради этого не стали), а проверяется в админке: список
-- «Родительская категория» в форме предлагает только категории, у которых
-- самих нет parent_id (см. components/admin/categories/CategoriesManager.tsx).
--
-- on delete cascade: удаление родительской категории удаляет и её
-- подкатегории. Сама категория с подкатегориями всё равно не удаляется через
-- deleteCategory() без предупреждения — см. проверку в lib/actions/categories.ts,
-- которая отдельно блокирует удаление, если у категории есть дочерние записи.
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

alter table public.categories
  drop constraint if exists categories_parent_not_self;
alter table public.categories
  add constraint categories_parent_not_self check (parent_id is null or parent_id <> id);

create index if not exists categories_parent_id_idx on public.categories(parent_id);

notify pgrst, 'reload schema';
