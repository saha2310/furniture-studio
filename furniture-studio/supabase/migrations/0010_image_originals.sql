-- Keep an untouched source for site-level single images too, mirroring
-- work_images.original_path (see 0008_work_image_original.sql) — without
-- this, re-opening the crop editor for the logo/favicon/OG-image/category
-- image after it was already cropped once had nothing to crop from but the
-- previous crop's result. Hero image is stored in home_sections.content_json
-- (jsonb) and does not need a migration — its original path lives alongside
-- imagePath as content_json.imageOriginalPath.
alter table public.categories
  add column if not exists image_original_path text;

alter table public.site_settings
  add column if not exists logo_original_path text,
  add column if not exists favicon_original_path text,
  add column if not exists og_image_original_path text;

notify pgrst, 'reload schema';
