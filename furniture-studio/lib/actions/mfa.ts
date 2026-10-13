'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminAccess } from '@/lib/auth/admin-access';
import { LOCKED_MESSAGE, clearAttempts, getClientIp, isBlocked, recordFailure } from '@/lib/auth/attempts';

export interface MfaCodeState {
  status: 'idle' | 'error';
  message?: string;
}

export type MfaEnrollStart =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; message: string };

const CODE_RE = /^\d{6}$/;

function normalizeCode(value: FormDataEntryValue | null): string {
  return String(value ?? '').replace(/\s+/g, '');
}

/**
 * Проверяет 6-значный код через Supabase (challenge + verify) с лимитом попыток.
 * Возвращает текст ошибки или null, если код верный. При успехе Supabase
 * повышает сессию до aal2, новые cookies проставляются автоматически.
 */
async function checkCode(factorId: string, code: string, userId: string): Promise<string | null> {
  const ip = await getClientIp();
  if (await isBlocked('mfa', ip, userId)) return LOCKED_MESSAGE;

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    if (error.status === 429) {
      return 'Слишком много запросов. Подождите немного и попробуйте снова.';
    }
    await recordFailure('mfa', ip, userId);
    return 'Неверный код. Проверьте, что на телефоне включено автоматическое время, и попробуйте ещё раз.';
  }

  await clearAttempts('mfa', ip, userId);
  return null;
}

/** Вход: ввод кода из приложения после пароля. */
export async function verifyMfaLogin(_prev: MfaCodeState, formData: FormData): Promise<MfaCodeState> {
  const code = normalizeCode(formData.get('code'));
  if (!CODE_RE.test(code)) {
    return { status: 'error', message: 'Введите 6 цифр из приложения.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // totp — только подтверждённые факторы.
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (error || !factor) {
    return { status: 'error', message: 'Не найден подключённый аутентификатор. Выйдите и войдите заново.' };
  }

  const failure = await checkCode(factor.id, code, user.id);
  if (failure) return { status: 'error', message: failure };

  redirect('/admin');
}

/**
 * Настройка, шаг 1: создаёт секретный ключ и возвращает QR-код.
 * Доступна только пока 2FA ещё НЕ настроена: если подтверждённый фактор уже
 * есть, добавить второй можно только после входа с кодом — иначе тот, кто
 * узнал пароль, подключил бы к аккаунту свой телефон.
 */
export async function startMfaEnrollment(): Promise<MfaEnrollStart> {
  const supabase = await createClient();
  const { access, user } = await getAdminAccess(supabase.auth);

  if (!user) return { ok: false, message: 'Сессия истекла. Войдите заново.' };
  if (access !== 'needs_mfa_setup') {
    return { ok: false, message: 'Двухфакторная защита уже настроена.' };
  }

  // Убираем брошенные незавершённые попытки — иначе новая настройка может
  // упереться в дубликат.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status !== 'verified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Админка' });
  if (error || !data) {
    return {
      ok: false,
      message: `Не удалось создать ключ${error?.message ? `: ${error.message}` : ''}. Проверьте, что в Supabase (Authentication → Multi-Factor) включён TOTP.`,
    };
  }

  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Настройка, шаг 2: подтверждение первым кодом из приложения. */
export async function confirmMfaEnrollment(_prev: MfaCodeState, formData: FormData): Promise<MfaCodeState> {
  const factorId = String(formData.get('factorId') ?? '');
  const code = normalizeCode(formData.get('code'));

  if (!factorId) return { status: 'error', message: 'Сначала нажмите «Показать QR-код».' };
  if (!CODE_RE.test(code)) return { status: 'error', message: 'Введите 6 цифр из приложения.' };

  const supabase = await createClient();
  const { access, user } = await getAdminAccess(supabase.auth);
  if (!user || access !== 'needs_mfa_setup') {
    return { status: 'error', message: 'Сессия изменилась. Обновите страницу.' };
  }

  const failure = await checkCode(factorId, code, user.id);
  if (failure) return { status: 'error', message: failure };

  redirect('/admin');
}
