-- Лимит неудачных попыток входа в админку (пароль и код 2FA).
--
-- Таблицу пишет и читает ТОЛЬКО серверный код через service_role
-- (lib/auth/attempts.ts). Политик RLS намеренно нет: для anon/authenticated
-- таблица недоступна ни на чтение, ни на запись.
--
-- Что хранится (только неудачные попытки, записи старше суток удаляются кодом):
--   kind        — 'login' (пароль) или 'mfa' (код из приложения)
--   ip          — IP, с которого пришла попытка
--   identifier  — SHA-256 от email (для 'login') или id пользователя (для 'mfa'),
--                 сам email в таблицу не попадает
--   created_at  — время попытки
--
-- Идемпотентна: можно выполнять повторно.

create table if not exists public.admin_auth_attempts (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('login', 'mfa')),
  ip text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_auth_attempts_ip_idx
  on public.admin_auth_attempts (kind, ip, created_at desc);

create index if not exists admin_auth_attempts_identifier_idx
  on public.admin_auth_attempts (kind, identifier, created_at desc);

alter table public.admin_auth_attempts enable row level security;

-- Страховка поверх RLS: явно забираем права у публичных ролей.
revoke all on public.admin_auth_attempts from anon, authenticated;

notify pgrst, 'reload schema';
