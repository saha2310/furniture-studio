// Ежедневный лёгкий пинг базы, чтобы Supabase free-тариф не ставил проект
// на паузу (пауза наступает после ~7 дней без обращений к БД — см. README,
// раздел "Известные ограничения"). Отдельно от app/api/cron/backup/route.ts:
// бэкап раз в неделю сам обращается к БД, но это слишком близко к границе
// в 7 дней (один пропуск/сбой — и проект уснёт). Этот роут ничего не
// экспортирует и не шлёт email — просто самый дешёвый SELECT раз в день.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    // Любой реальный SELECT считается "активностью" для Supabase.
    // site_settings — синглтон-таблица, всегда есть одна строка, запрос
    // максимально дешёвый.
    const { error } = await supabase.from('site_settings').select('id').limit(1);
    if (error) throw error;

    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Keep-alive не удался.';
    console.error('[cron/keep-alive]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
