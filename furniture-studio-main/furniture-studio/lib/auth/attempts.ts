import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Лимит неудачных попыток входа в админку (пароль и код 2FA).
 * Таблица — supabase/migrations/0013_admin_auth_attempts.sql, доступна только
 * через service_role. Считаем только НЕУДАЧНЫЕ попытки за последние 15 минут.
 *
 * Важно понимать границы: лимит работает для формы входа на этом сайте. Запросы
 * напрямую к Supabase Auth в обход сайта ограничивает сам Supabase (свои лимиты
 * на IP). От украденного пароля защищает не лимит, а второй фактор (2FA).
 *
 * Если таблицы нет или БД недоступна — лимит «пропускает» (fail-open) и пишет
 * ошибку в лог: сломанный лимит не должен запирать администратора.
 */

export type AttemptKind = 'login' | 'mfa';

const WINDOW_MS = 15 * 60 * 1000;
const KEEP_MS = 24 * 60 * 60 * 1000;

// perIp — сколько неудач с одного IP, perIdentifier — сколько неудач на один
// email (login) или одного пользователя (mfa). Второй лимит работает, даже если
// атакующий подделывает IP.
const LIMITS: Record<AttemptKind, { perIp: number; perIdentifier: number }> = {
  login: { perIp: 5, perIdentifier: 15 },
  mfa: { perIp: 10, perIdentifier: 5 },
};

export const LOCKED_MESSAGE = 'Слишком много неудачных попыток. Подождите 15 минут и попробуйте снова.';

/**
 * IP клиента. Сначала X-Real-IP, затем ПОСЛЕДНИЙ адрес из X-Forwarded-For
 * (его добавляет ваш прокси; первые адреса клиент может подделать).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const realIp = h.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return 'unknown';
}

/** Хэш идентификатора, чтобы не хранить введённый email в открытом виде. */
export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function isBlocked(kind: AttemptKind, ip: string, identifier: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const [byIp, byIdentifier] = await Promise.all([
      supabase
        .from('admin_auth_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('ip', ip)
        .gte('created_at', since),
      supabase
        .from('admin_auth_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('identifier', identifier)
        .gte('created_at', since),
    ]);

    if (byIp.error || byIdentifier.error) {
      console.error('[auth-attempts] не удалось проверить лимит:', byIp.error ?? byIdentifier.error);
      return false;
    }

    return (byIp.count ?? 0) >= LIMITS[kind].perIp || (byIdentifier.count ?? 0) >= LIMITS[kind].perIdentifier;
  } catch (error) {
    console.error('[auth-attempts] лимит недоступен:', error);
    return false;
  }
}

export async function recordFailure(kind: AttemptKind, ip: string, identifier: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('admin_auth_attempts').insert({ kind, ip, identifier });
    // Заодно чистим старые записи — отдельный cron не нужен.
    await supabase
      .from('admin_auth_attempts')
      .delete()
      .lt('created_at', new Date(Date.now() - KEEP_MS).toISOString());
  } catch (error) {
    console.error('[auth-attempts] не удалось записать неудачную попытку:', error);
  }
}

/** После успешного входа сбрасываем счётчик, чтобы администратор не «копил» штраф. */
export async function clearAttempts(kind: AttemptKind, ip: string, identifier: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('admin_auth_attempts').delete().eq('kind', kind).eq('identifier', identifier);
    await supabase.from('admin_auth_attempts').delete().eq('kind', kind).eq('ip', ip);
  } catch (error) {
    console.error('[auth-attempts] не удалось сбросить счётчик:', error);
  }
}
