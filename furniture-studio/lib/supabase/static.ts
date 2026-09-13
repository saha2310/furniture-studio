import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Клиент для запросов вне контекста обычного HTTP-запроса — в первую очередь
 * для generateStaticParams, который выполняется на этапе сборки, где cookies()
 * из next/headers недоступен (нет активного request scope).
 *
 * Использует только anon key, без сессии — подходит исключительно для чтения
 * публичных данных, подчиняющихся RLS (как обычный анонимный посетитель).
 */
export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
