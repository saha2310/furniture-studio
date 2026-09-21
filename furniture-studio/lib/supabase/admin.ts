import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Клиент с service_role — полный доступ к БД и Storage в обход RLS.
 *
 * На момент написания ни один текущий flow его не использует: публичные чтения
 * и запись заявок идут через anon key + RLS, админские мутации — через сессию
 * пользователя + RLS (см. ARCHITECTURE.md, раздел Auth). Клиент оставлен на
 * будущее — например, для экспорта данных или batch-операций, которым RLS
 * будет мешать даже под авторизованным пользователем.
 *
 * `server-only` не даёт случайно импортировать этот файл в клиентский код.
 * НЕ использовать для операций, которые должны подчиняться правам текущего
 * пользователя — для этого lib/supabase/server.ts.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY не задан в переменных окружения.');
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
