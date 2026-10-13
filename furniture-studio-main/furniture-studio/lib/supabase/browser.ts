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
 *
 * Синглтон: если каждый компонент, которому нужен браузерный клиент, будет
 * вызывать createBrowserClient(...) заново, на странице появится несколько
 * независимых экземпляров GoTrueClient — все они пытаются взять один и тот же
 * navigator.locks lock на обновление auth-токена и мешают друг другу
 * (в консоли — "Acquiring an exclusive Navigator LockManager lock ... failed").
 * Само по себе не ломает сессию (есть повтор), но лишний шум и лишняя работа.
 * Один и тот же клиент на весь браузерный таб решает это.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return browserClient;
}
