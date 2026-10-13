import { createClient } from '@/lib/supabase/server';
import { getAdminAccess } from '@/lib/auth/admin-access';

/**
 * Проверяет, что запрос выполняется от имени администратора, прошедшего
 * ОБА шага входа: пароль и код 2FA (aal2). Сессия «только пароль» (aal1) не
 * проходит. Server Actions в админке обязаны вызывать это первой строкой — RLS
 * защищает данные на уровне БД, но без этой проверки ошибка пришла бы как
 * malformed Postgres error вместо понятного пользователю сообщения.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { access, user } = await getAdminAccess(supabase.auth);

  if (!user || access !== 'ok') {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'UNAUTHORIZED';
}
