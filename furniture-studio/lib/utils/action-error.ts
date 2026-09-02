export function actionError(fallback: string, error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (code === '23505') return `${fallback} Уже существует запись с такими данными.`;
  if (code === '23503') return `${fallback} Нельзя удалить или изменить связанную запись.`;
  if (code === '42501') return `${fallback} Нет прав на изменение данных. Проверьте авторизацию в Supabase.`;
  if (code === 'PGRST204' || /column .* does not exist/i.test(message)) {
    return `${fallback} База данных не обновлена до текущей версии. Примените миграцию supabase/migrations/0002_redesign_fields.sql.`;
  }
  if (/JWT|auth|session/i.test(message)) return `${fallback} Сессия администратора недействительна. Выйдите и войдите снова.`;
  return message ? `${fallback} Код: ${code || 'без кода'}.` : fallback;
}
