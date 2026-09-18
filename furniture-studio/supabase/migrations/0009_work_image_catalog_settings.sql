-- Per-image display settings used only by work cards on /works.
-- The source image is never modified; these values control the crop/zoom/flip
-- presentation at render time.
alter table public.work_images
  add column if not exists catalog_position_x numeric not null default 50,
  add column if not exists catalog_position_y numeric not null default 50,
  add column if not exists catalog_zoom numeric not null default 1,
  add column if not exists catalog_flip_horizontal boolean not null default false;

alter table public.work_images
  drop constraint if exists work_images_catalog_position_x_check,
  drop constraint if exists work_images_catalog_position_y_check,
  drop constraint if exists work_images_catalog_zoom_check;

alter table public.work_images
  add constraint work_images_catalog_position_x_check check (catalog_position_x >= 0 and catalog_position_x <= 100),
  add constraint work_images_catalog_position_y_check check (catalog_position_y >= 0 and catalog_position_y <= 100),
  add constraint work_images_catalog_zoom_check check (catalog_zoom >= 1 and catalog_zoom <= 4);

notify pgrst, 'reload schema';
