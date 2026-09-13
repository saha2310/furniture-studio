-- Баг из 0001_init.sql: политика home_sections_admin_write разрешала только
-- UPDATE, а строки с ключом 'contacts_gallery' в home_sections изначально не
-- было (её завели позже, вместе с блоком карусели на /contacts). Из-за этого
-- ContactsGalleryEditor.updateContactsGallery() при первом сохранении делает
-- upsert(), который под капотом пытается сначала INSERT — а на INSERT прав
-- не было, и Supabase возвращал 42501 ("Нет прав на изменение данных").
--
-- Чиним оба конца проблемы:
--   1) политику расширяем на все операции (as у остальных admin-write таблиц,
--      см. categories_admin_write / works_admin_write — они используют "for all",
--      а не "for update"),
--   2) досеиваем недостающую строку, чтобы для уже развёрнутых проектов
--      Supabase будущий upsert стал обычным UPDATE.

drop policy if exists "home_sections_admin_write" on home_sections;

create policy "home_sections_admin_write" on home_sections for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into home_sections (key, sort_order) values
  ('contacts_gallery', 7)
on conflict (key) do nothing;
