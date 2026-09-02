-- Дополнительные поля для premium frontend и улучшенной CMS
alter table categories add column if not exists image_path text;
alter table works add column if not exists price text;

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
create policy "site_menu_public_read" on site_menu_items for select using (is_visible = true or auth.role() = 'authenticated');
create policy "site_menu_admin_write" on site_menu_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into site_menu_items (label, href, sort_order)
select 'Работы', '/works', 0 where not exists (select 1 from site_menu_items);
insert into site_menu_items (label, href, sort_order)
select 'О мастерской', '/about', 1 where not exists (select 1 from site_menu_items where href = '/about');
insert into site_menu_items (label, href, sort_order)
select 'Контакты', '/contacts', 2 where not exists (select 1 from site_menu_items where href = '/contacts');
