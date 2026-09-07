// Тонкий обработчик — вся логика в lib/backup/ (см. lib/backup/README.md).
// Физически обязан лежать здесь: Next.js App Router требует route.ts внутри app/.
//
// Ответ стримится (см. lib/backup/export.ts → buildBackupZipStream) — иначе
// на Vercel это упёрлось бы в жёсткий лимит 4.5MB на тело ответа функции.
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from '@/lib/actions/auth-guard';
import { buildBackupZipStream } from '@/lib/backup/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireUser();
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    throw error;
  }

  try {
    const supabase = await createClient();
    const nodeStream = await buildBackupZipStream(supabase);
    // Типы JSZip объявляют NodeJS.ReadableStream (общий интерфейс), а по факту
    // это настоящий stream.Readable — Readable.toWeb() ожидает именно его.
    const webStream = Readable.toWeb(nodeStream as Readable) as ReadableStream;
    const filename = `backup-${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось собрать резервную копию.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
