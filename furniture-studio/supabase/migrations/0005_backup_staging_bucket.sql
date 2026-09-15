-- lib/backup/ (см. lib/backup/README.md): временный приватный бакет для
-- загрузки архива восстановления. Админ грузит .zip сюда прямо из браузера
-- (см. lib/supabase/browser.ts) — так тело серверной функции не участвует
-- в передаче большого файла и не упирается в лимит Vercel на payload.
-- Файл здесь живёт только на время одного импорта и сразу удаляется
-- Route Handler'ом (app/admin/api/backup/import/route.ts) после обработки —
-- независимо от того, успешно прошёл импорт или нет.
--
-- В отличие от "works"/"site" бакет НЕ публичный: бэкап не должен быть
-- доступен по прямой ссылке никому, кроме авторизованного администратора.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'backups_bucket_admin_read') then
    create policy "backups_bucket_admin_read" on storage.objects for select
      using (bucket_id = 'backups' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'backups_bucket_admin_write') then
    create policy "backups_bucket_admin_write" on storage.objects for insert
      with check (bucket_id = 'backups' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'backups_bucket_admin_delete') then
    create policy "backups_bucket_admin_delete" on storage.objects for delete
      using (bucket_id = 'backups' and auth.role() = 'authenticated');
  end if;
end $$;
