-- Гарантирует, что в существующей БД после первого развёртывания есть базовое меню.
-- Дублирует создание site_menu_items из 0002 (написана независимо, для баз, где
-- 0002 применилась не полностью) и снова дублируется в 0004. Идемпотентна, но
-- является исторической страховкой — см. комментарий в начале 0002.
create table if not exists site_menu_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_menu_items_visible_idx on site_menu_items(is_visible, sort_order);

alter table site_menu_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'site_menu_items' and policyname = 'site_menu_public_read'
  ) then
    create policy "site_menu_public_read" on site_menu_items for select using (is_visible = true or auth.role() = 'authenticated');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'site_menu_items' and policyname = 'site_menu_admin_write'
  ) then
    create policy "site_menu_admin_write" on site_menu_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;

insert into site_menu_items (label, href, sort_order, is_visible)
select v.label, v.href, v.sort_order, true
from (values
  ('Работы', '/works', 0),
  ('О мастерской', '/about', 1),
  ('Контакты', '/contacts', 2)
) as v(label, href, sort_order)
where not exists (select 1 from site_menu_items where site_menu_items.href = v.href);
