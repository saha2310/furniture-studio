import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Уровень доступа текущей сессии к админке:
 *  - anonymous       — не вошли (или сессию не удалось определить);
 *  - needs_mfa_setup — пароль верный, но 2FA ещё не настроена → /admin/security;
 *  - needs_mfa_code  — пароль верный, 2FA настроена, нужен код → /admin/login/mfa;
 *  - ok              — пароль + код (aal2), доступ открыт.
 *
 * Файл без 'server-only': его использует и middleware (edge), и серверный код.
 */
export type AdminAccess = 'anonymous' | 'needs_mfa_setup' | 'needs_mfa_code' | 'ok';

type AuthApi = SupabaseClient['auth'];

/** Определяет уровень доступа по уже полученному пользователю (без лишнего getUser). */
export async function resolveAdminAccess(auth: AuthApi, user: User | null): Promise<AdminAccess> {
  if (!user) return 'anonymous';

  const { data, error } = await auth.mfa.getAuthenticatorAssuranceLevel();
  // Не смогли определить уровень — закрываем (отправляем на страницу входа).
  if (error || !data) return 'anonymous';

  if (data.currentLevel === 'aal2') return 'ok';
  if (data.currentLevel !== 'aal1') return 'anonymous';

  // aal1: код нужен, если у пользователя есть подтверждённый фактор.
  // user.factors — свежие данные с сервера (getUser), nextLevel — из сессии.
  const hasVerifiedFactor =
    data.nextLevel === 'aal2' || (user.factors ?? []).some((factor) => factor.status === 'verified');

  return hasVerifiedFactor ? 'needs_mfa_code' : 'needs_mfa_setup';
}

/** getUser() + resolveAdminAccess(). Для Server Components, actions и route handlers. */
export async function getAdminAccess(auth: AuthApi): Promise<{ access: AdminAccess; user: User | null }> {
  const {
    data: { user },
  } = await auth.getUser();

  const access = await resolveAdminAccess(auth, user);
  return { access, user: access === 'anonymous' ? null : user };
}
