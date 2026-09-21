// Тонкий обработчик — вся логика в lib/backup/ (см. lib/backup/README.md).
//
// Намеренно лежит вне /admin/* — middleware.ts защищает /admin/:path*
// проверкой сессии-cookie, а у вызова от Vercel Cron сессии нет вообще,
// только заголовок Authorization с CRON_SECRET. Если бы этот роут лежал под
// /admin, middleware редиректил бы cron-запрос на страницу логина, до кода
// ниже он бы просто не доходил.
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildBackupZip } from '@/lib/backup/export';
import { sendBackupEmail } from '@/lib/backup/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Проверяем ДАЖЕ отсутствие cronSecret как отказ — иначе на проекте без
  // настроенного секрета этот роут был бы публично доступен кому угодно.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Сессии пользователя тут нет (это server-to-server вызов от Vercel, не
    // браузер) — поэтому service_role клиент, а не lib/supabase/server.ts.
    const supabase = createAdminClient();
    const buffer = await buildBackupZip(supabase);
    const filename = `backup-${new Date().toISOString().slice(0, 10)}.zip`;
    await sendBackupEmail(buffer, filename);
    return NextResponse.json({ ok: true, filename, size: buffer.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Автобэкап не удался.';
    console.error('[cron/backup]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
