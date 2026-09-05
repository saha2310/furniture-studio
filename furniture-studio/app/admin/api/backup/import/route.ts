// Тонкий обработчик — вся логика в lib/backup/ (см. lib/backup/README.md).
// Физически обязан лежать здесь: Next.js App Router требует route.ts внутри app/.
//
// Архив сюда НЕ передаётся телом запроса — он уже загружен из браузера прямо
// в приватный бакет "backups" (см. lib/supabase/browser.ts и BackupPanel.tsx).
// Сюда приходит только storagePath — иначе на Vercel упёрлись бы в лимит
// 4.5MB на тело запроса функции при архиве с фото.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from '@/lib/actions/auth-guard';
import { restoreFromZip } from '@/lib/backup/import';
import type { ImportMode } from '@/lib/backup/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const storagePath = body?.storagePath;
  const mode = body?.mode;

  if (typeof storagePath !== 'string' || !storagePath) {
    return NextResponse.json({ error: 'Не передан путь к загруженному архиву.' }, { status: 400 });
  }
  if (mode !== 'add' && mode !== 'replace') {
    return NextResponse.json({ error: 'Не указан режим импорта.' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const { data: file, error: downloadError } = await supabase.storage.from('backups').download(storagePath);
    if (downloadError || !file) {
      return NextResponse.json({ error: 'Не удалось прочитать загруженный архив из хранилища.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await restoreFromZip(supabase, buffer, mode as ImportMode);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось восстановить данные из архива.';
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    // Staging-файл — не постоянное хранилище, чистим за собой в любом случае.
    await supabase.storage.from('backups').remove([storagePath]);
  }
}
