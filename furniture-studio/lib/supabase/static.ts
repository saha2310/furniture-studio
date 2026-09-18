import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Без явного таймаута fetch может зависнуть на неопределённое время (например,
// если проект Supabase на бесплатном тарифе "уснул" после простоя и не успел
// проснуться, или временный сетевой сбой между Vercel и Supabase). Для
// generateStaticParams/generateMetadata это особенно опасно: они выполняются
// на этапе `next build`, и зависший fetch без таймаута зависает саму сборку
// целиком — Vercel в итоге убивает её по своему лимиту, а в логах приложения
// не остаётся ничего, потому что ни одна наша строка кода (включая
// console.error) до этого просто не успевает выполниться.
const STATIC_FETCH_TIMEOUT_MS = 8_000;

function timeoutFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATIC_FETCH_TIMEOUT_MS);

  return fetch(input, { ...init, signal: init?.signal ?? controller.signal })
    .catch((err) => {
      if (controller.signal.aborted) {
        const url = typeof input === 'string' ? input : input.toString();
        throw new Error(
          `Supabase static query timed out after ${STATIC_FETCH_TIMEOUT_MS}ms: ${url}. ` +
            'Проверьте, что проект Supabase не приостановлен (пауза на free-тарифе) ' +
            'и что NEXT_PUBLIC_SUPABASE_URL указывает на рабочий проект.'
        );
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

/**
 * Клиент для запросов вне контекста обычного HTTP-запроса — в первую очередь
 * для generateStaticParams, который выполняется на этапе сборки, где cookies()
 * из next/headers недоступен (нет активного request scope).
 *
 * Использует только anon key, без сессии — подходит исключительно для чтения
 * публичных данных, подчиняющихся RLS (как обычный анонимный посетитель).
 *
 * fetch обёрнут таймаутом (см. timeoutFetch выше) — без него зависший запрос
 * к Supabase способен зависнуть саму сборку на Vercel без единой строки в логах.
 */
export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: timeoutFetch },
    }
  );
}
