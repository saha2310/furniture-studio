-- Единая страховочная миграция для текущей версии приложения.
-- Можно выполнять повторно: все операции идемпотентны.

alter table public.categories add column if not exists image_path text;
alter table public.works add column if not exists price text;

create table if not exists public.site_menu_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_menu_items_visible_idx
  on public.site_menu_items(is_visible, sort_order);

alter table public.site_menu_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_menu_items'
      and policyname = 'site_menu_public_read'
  ) then
    create policy site_menu_public_read
      on public.site_menu_items
      for select
      using (is_visible = true or auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_menu_items'
      and policyname = 'site_menu_admin_write'
  ) then
    create policy site_menu_admin_write
      on public.site_menu_items
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;

insert into public.site_menu_items (label, href, sort_order, is_visible)
select 'Работы', '/works', 0, true
where not exists (select 1 from public.site_menu_items where href = '/works');

insert into public.site_menu_items (label, href, sort_order, is_visible)
select 'О мастерской', '/about', 1, true
where not exists (select 1 from public.site_menu_items where href = '/about');

insert into public.site_menu_items (label, href, sort_order, is_visible)
select 'Контакты', '/contacts', 2, true
where not exists (select 1 from public.site_menu_items where href = '/contacts');

-- Просим PostgREST немедленно обновить schema cache после создания таблицы.
notify pgrst, 'reload schema';
