-- Дополнительные категории у работы (многие-ко-многим).
--
-- works.category_id остаётся как был — это «основная» категория: именно она
-- определяет slug-логику по умолчанию, а главное — используется как критерий
-- при группировке цветовых вариантов одного товара (attachWorkToGroup
-- по-прежнему требует, чтобы у вариантов пересекался хотя бы один набор
-- категорий — см. lib/actions/works.ts). Ломать это на полноценный
-- many-to-many без единой «главной» категории означало бы переписывать
-- логику группировки цветов и часть публичных запросов без необходимости —
-- задача была именно «уметь присвоить работе ещё несколько каталогов
-- вдобавок к основному», а не убрать понятие основной категории.
--
-- work_categories хранит ТОЛЬКО дополнительные категории (без строки для
-- основной category_id — она и так есть в works). Итоговый набор категорий
-- работы = {works.category_id} ∪ {category_id из work_categories}.
create table if not exists public.work_categories (
  work_id uuid not null references public.works(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (work_id, category_id)
);

create index if not exists work_categories_category_id_idx on public.work_categories(category_id);
create index if not exists work_categories_work_id_idx on public.work_categories(work_id);

alter table public.work_categories enable row level security;

-- Читаемо, если родительская работа опубликована либо пользователь — admin
-- (тот же паттерн, что у work_images).
create policy "work_categories_public_read" on public.work_categories for select
  using (
    auth.role() = 'authenticated'
    or exists (select 1 from public.works w where w.id = work_id and w.status = 'published')
  );
create policy "work_categories_admin_write" on public.work_categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
