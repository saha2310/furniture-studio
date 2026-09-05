import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from '@/lib/actions/auth-guard';
import { importFromJson, parseJsonImportText } from '@/lib/backup/json-import';

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
  if (typeof storagePath !== 'string' || !storagePath) {
    return NextResponse.json({ error: 'Не передан путь к загруженному JSON.' }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const { data: file, error: downloadError } = await supabase.storage.from('backups').download(storagePath);
    if (downloadError || !file) {
      return NextResponse.json({ error: 'Не удалось прочитать загруженный JSON из хранилища.' }, { status: 400 });
    }

    const text = await file.text();
    const raw = parseJsonImportText(text);
    const summary = await importFromJson(supabase, raw);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось импортировать JSON.';
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    await supabase.storage.from('backups').remove([storagePath]);
  }
}
