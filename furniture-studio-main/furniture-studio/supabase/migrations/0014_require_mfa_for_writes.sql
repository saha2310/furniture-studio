-- Второй фактор (2FA) на уровне БД: менять данные и читать заявки/бэкапы
-- может только сессия, прошедшая проверку кодом из приложения (aal2).
--
-- ⚠️ ПОРЯДОК ВАЖЕН. Применять ТОЛЬКО после того, как:
--   1) новая версия сайта задеплоена,
--   2) вы вошли в админку и настроили 2FA (страница /admin/security),
--   3) вошли повторно уже с кодом и убедились, что админка работает.
-- Если применить раньше, вы сможете войти и настроить 2FA, но сохранять
-- изменения в админке не получится, пока сессия не пройдёт проверку кодом.
--
-- Как это работает: «ограничительные» (restrictive) политики RLS складываются
-- с уже существующими через И. Существующие политики не меняются — к ним
-- добавляется требование aal2 в JWT. Публичные чтения сайта не затрагиваются.
-- service_role (cron-бэкап, keep-alive) обходит RLS и не затронут.
--
-- Идемпотентна: можно выполнять повторно.
-- Откат — блок в самом конце файла.

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'works', 'work_images', 'site_settings', 'contact_links',
    'home_sections', 'contact_requests', 'site_menu_items', 'work_categories'
  ]
  loop
    -- Пропускаем таблицы, которых нет в этой базе.
    if to_regclass('public.' || t) is null then
      raise notice 'Таблица public.% не найдена — пропущена', t;
      continue;
    end if;

    execute format('drop policy if exists require_aal2_insert on public.%I', t);
    execute format(
      $p$create policy require_aal2_insert on public.%I as restrictive for insert to authenticated
         with check ((select auth.jwt() ->> 'aal') = 'aal2')$p$, t);

    execute format('drop policy if exists require_aal2_update on public.%I', t);
    execute format(
      $p$create policy require_aal2_update on public.%I as restrictive for update to authenticated
         using ((select auth.jwt() ->> 'aal') = 'aal2')
         with check ((select auth.jwt() ->> 'aal') = 'aal2')$p$, t);

    execute format('drop policy if exists require_aal2_delete on public.%I', t);
    execute format(
      $p$create policy require_aal2_delete on public.%I as restrictive for delete to authenticated
         using ((select auth.jwt() ->> 'aal') = 'aal2')$p$, t);
  end loop;
end $$;

-- Заявки содержат персональные данные — читать их тоже только после 2FA.
do $$
begin
  if to_regclass('public.contact_requests') is not null then
    drop policy if exists require_aal2_select on public.contact_requests;
    create policy require_aal2_select on public.contact_requests
      as restrictive for select to authenticated
      using ((select auth.jwt() ->> 'aal') = 'aal2');
  end if;
end $$;

-- Storage: запись в бакеты works / site / backups и чтение приватного backups.
-- Публичное чтение works и site (картинки сайта) не затрагивается.
drop policy if exists require_aal2_storage_insert on storage.objects;
create policy require_aal2_storage_insert on storage.objects
  as restrictive for insert to authenticated
  with check (
    bucket_id not in ('works', 'site', 'backups')
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

drop policy if exists require_aal2_storage_update on storage.objects;
create policy require_aal2_storage_update on storage.objects
  as restrictive for update to authenticated
  using (
    bucket_id not in ('works', 'site', 'backups')
    or (select auth.jwt() ->> 'aal') = 'aal2'
  )
  with check (
    bucket_id not in ('works', 'site', 'backups')
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

drop policy if exists require_aal2_storage_delete on storage.objects;
create policy require_aal2_storage_delete on storage.objects
  as restrictive for delete to authenticated
  using (
    bucket_id not in ('works', 'site', 'backups')
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

drop policy if exists require_aal2_storage_select_backups on storage.objects;
create policy require_aal2_storage_select_backups on storage.objects
  as restrictive for select to authenticated
  using (
    bucket_id <> 'backups'
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );

-- ---------------------------------------------------------------------------
-- ОТКАТ (если нужно срочно вернуть прежнее поведение) — выполнить отдельно:
--
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'categories','works','work_images','site_settings','contact_links',
--     'home_sections','contact_requests','site_menu_items','work_categories'
--   ] loop
--     if to_regclass('public.' || t) is not null then
--       execute format('drop policy if exists require_aal2_insert on public.%I', t);
--       execute format('drop policy if exists require_aal2_update on public.%I', t);
--       execute format('drop policy if exists require_aal2_delete on public.%I', t);
--     end if;
--   end loop;
-- end $$;
-- drop policy if exists require_aal2_select on public.contact_requests;
-- drop policy if exists require_aal2_storage_insert on storage.objects;
-- drop policy if exists require_aal2_storage_update on storage.objects;
-- drop policy if exists require_aal2_storage_delete on storage.objects;
-- drop policy if exists require_aal2_storage_select_backups on storage.objects;
-- ---------------------------------------------------------------------------
