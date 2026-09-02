import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Клиент для Server Components / Server Actions / Route Handlers.
 * Читает и пишет сессию через cookies, использует anon key — запросы
 * выполняются от имени текущего пользователя (или анонимно) и подчиняются RLS.
 *
 * Не кэшировать/переиспользовать между запросами — создаётся заново каждый раз,
 * т.к. привязан к cookies конкретного request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll вызывается из Server Component без возможности записи cookies —
            // безопасно игнорировать, если рядом есть middleware, обновляющий сессию.
          }
        },
      },
    }
  );
}
