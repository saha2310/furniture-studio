-- ============================================================================
-- Furniture Studio — начальная схема
-- Применить: supabase db push  (или через Supabase Dashboard > SQL Editor)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- works
-- ----------------------------------------------------------------------------
create table if not exists works (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text,
  specs jsonb not null default '{}'::jsonb,
  cover_image_id uuid, -- FK добавляется ниже, после создания work_images (циклическая зависимость)
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_category_id_idx on works(category_id);
create index if not exists works_status_idx on works(status);
create index if not exists works_is_featured_idx on works(is_featured);

-- ----------------------------------------------------------------------------
-- work_images
-- ----------------------------------------------------------------------------
create table if not exists work_images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists work_images_work_id_idx on work_images(work_id);

insert into categories (name, slug, sort_order) values
  ('Диваны', 'divany', 0),
  ('Кресла', 'kresla', 1)
on conflict (slug) do nothing;

alter table works
  add constraint works_cover_image_id_fkey
  foreign key (cover_image_id) references work_images(id) on delete set null;

-- ----------------------------------------------------------------------------
-- site_settings (singleton: всегда ровно одна строка с id = 1)
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  id integer primary key default 1,
  company_name text,
  logo_path text,
  favicon_path text,
  phone text,
  email text,
  address text,
  seo_default_title text,
  seo_default_description text,
  og_image_path text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into site_settings (id, company_name, seo_default_title, seo_default_description)
values (1, 'Мастерская мягкой мебели', 'Диваны на заказ', 'Изготавливаем диваны и кресла индивидуально под пространство клиента.')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- contact_links (динамический список способов связи — Telegram, VK, TikTok и т.д.)
-- ----------------------------------------------------------------------------
create table if not exists contact_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  icon_key text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists contact_links_visible_idx on contact_links(is_visible);

-- ----------------------------------------------------------------------------
-- home_sections (редактируемые блоки главной/about/contacts; key уникален)
-- ----------------------------------------------------------------------------
create table if not exists home_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  content_json jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into home_sections (key, sort_order) values
  ('hero', 0),
  ('what_we_create', 1),
  ('featured_works', 2),
  ('process', 3),
  ('custom_made', 4),
  ('about_teaser', 5),
  ('contact_cta', 6),
  ('about_page', 0),
  ('contacts_page', 0)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- contact_requests
-- ----------------------------------------------------------------------------
create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  request_type text,
  comment text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  source_page text,
  created_at timestamptz not null default now()
);

create index if not exists contact_requests_created_at_idx on contact_requests(created_at desc);
create index if not exists contact_requests_status_idx on contact_requests(status);

-- ----------------------------------------------------------------------------
-- updated_at триггеры
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger works_set_updated_at
  before update on works
  for each row execute function set_updated_at();

create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

create trigger home_sections_set_updated_at
  before update on home_sections
  for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table categories enable row level security;
alter table works enable row level security;
alter table work_images enable row level security;
alter table site_settings enable row level security;
alter table contact_links enable row level security;
alter table home_sections enable row level security;
alter table contact_requests enable row level security;

-- categories: публичное чтение, запись только authenticated
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- works: публично видны только опубликованные, admin видит/пишет всё
create policy "works_public_read_published" on works for select
  using (status = 'published' or auth.role() = 'authenticated');
create policy "works_admin_write" on works for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- work_images: читаемы, если родительская work опубликована или пользователь — admin
create policy "work_images_public_read" on work_images for select
  using (
    auth.role() = 'authenticated'
    or exists (select 1 from works w where w.id = work_id and w.status = 'published')
  );
create policy "work_images_admin_write" on work_images for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- site_settings: публичное чтение, запись только authenticated
create policy "site_settings_public_read" on site_settings for select using (true);
create policy "site_settings_admin_write" on site_settings for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- contact_links: публично видны только is_visible, admin видит/пишет всё
create policy "contact_links_public_read" on contact_links for select
  using (is_visible = true or auth.role() = 'authenticated');
create policy "contact_links_admin_write" on contact_links for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- home_sections: публичное чтение, запись только authenticated
create policy "home_sections_public_read" on home_sections for select using (true);
create policy "home_sections_admin_write" on home_sections for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- contact_requests: любой может создать заявку (INSERT), но не читать чужие;
-- читать/менять/удалять может только authenticated (админ)
create policy "contact_requests_public_insert" on contact_requests for insert
  with check (true);
create policy "contact_requests_admin_read" on contact_requests for select
  using (auth.role() = 'authenticated');
create policy "contact_requests_admin_write" on contact_requests for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "contact_requests_admin_delete" on contact_requests for delete
  using (auth.role() = 'authenticated');

-- ============================================================================
-- STORAGE: буcкеты и политики
-- Buckets создаются здесь через storage.buckets — в Supabase это доступно из SQL.
-- Если insert не проходит (например, из-за прав), создайте бакеты вручную
-- в Dashboard > Storage: "works" и "site", оба публичные (Public bucket = on).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('works', 'works', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

create policy "works_bucket_public_read" on storage.objects for select
  using (bucket_id = 'works');
create policy "works_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'works' and auth.role() = 'authenticated');
create policy "works_bucket_admin_update" on storage.objects for update
  using (bucket_id = 'works' and auth.role() = 'authenticated');
create policy "works_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'works' and auth.role() = 'authenticated');

create policy "site_bucket_public_read" on storage.objects for select
  using (bucket_id = 'site');
create policy "site_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'site' and auth.role() = 'authenticated');
create policy "site_bucket_admin_update" on storage.objects for update
  using (bucket_id = 'site' and auth.role() = 'authenticated');
create policy "site_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'site' and auth.role() = 'authenticated');
