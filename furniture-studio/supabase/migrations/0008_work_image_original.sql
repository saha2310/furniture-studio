-- Keep an untouched source for every work image so subsequent crop/flip edits
-- always start from the original instead of from an already processed image.
alter table public.work_images
  add column if not exists original_path text;

notify pgrst, 'reload schema';
