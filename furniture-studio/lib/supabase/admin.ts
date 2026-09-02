import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Клиент с service role key — обходит RLS. Используется ТОЛЬКО там, где
 * это осознанно необходимо (например, чтение всех contact_requests в админке
 * до момента, когда мы точно знаем, что вызывающий — авторизованный админ).
 *
 * Импорт 'server-only' гарантирует сборку упадёт с ошибкой, если этот файл
 * случайно попадёт в клиентский бандл.
 *
 * Каждый вызов, использующий этот клиент, должен САМ проверить авторизацию
 * перед выполнением запроса — этот клиент не делает это за вас.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY или NEXT_PUBLIC_SUPABASE_URL не заданы. Проверьте .env.local'
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
