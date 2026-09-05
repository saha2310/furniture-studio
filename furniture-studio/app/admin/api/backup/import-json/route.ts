import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from '@/lib/actions/auth-guard';
import { importFromJson } from '@/lib/backup/json-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
    throw error;
  }

  try {
    // JSON приходит прямо в теле запроса. Для JSON это безопаснее и проще,
    // чем сначала загружать небольшой файл в Supabase Storage.
    const raw = await request.json();
    const supabase = await createClient();
    const summary = await importFromJson(supabase, raw);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось импортировать JSON.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
