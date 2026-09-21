import { createClient } from '@/lib/supabase/server';

/**
 * Проверяет, что запрос выполняется от имени авторизованного пользователя.
 * Server Actions в админке обязаны вызывать это первой строкой — RLS защищает
 * данные на уровне БД, но без этой проверки ошибка пришла бы как malformed
 * Postgres error вместо понятного пользователю сообщения.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'UNAUTHORIZED';
}
