import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Клиент для браузера (anon key, сессия из тех же cookie, что и на сервере —
 * @supabase/ssr синхронизирует их автоматически).
 *
 * До модуля lib/backup/ в проекте такого клиента не было: все загрузки файлов
 * шли через Server Actions на сервер. Он понадобился именно для бэкапов —
 * см. lib/backup/README.md, почему архив с фото нужно грузить в Storage прямо
 * из браузера, а не через тело серверной функции.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
