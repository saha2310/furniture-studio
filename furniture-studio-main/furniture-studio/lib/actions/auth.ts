'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LOCKED_MESSAGE, clearAttempts, getClientIp, hashIdentifier, isBlocked, recordFailure } from '@/lib/auth/attempts';

export interface LoginState {
  status: 'idle' | 'error';
  message?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { status: 'error', message: 'Укажите email и пароль' };
  }

  // Лимит неудачных попыток (5 с одного IP / 15 на один email за 15 минут).
  const ip = await getClientIp();
  const identifier = hashIdentifier(email);
  if (await isBlocked('login', ip, identifier)) {
    return { status: 'error', message: LOCKED_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 429 — сработал собственный лимит Supabase, это не неверный пароль.
    if (error.status === 429) {
      return { status: 'error', message: 'Слишком много запросов. Подождите немного и попробуйте снова.' };
    }
    await recordFailure('login', ip, identifier);
    return { status: 'error', message: 'Неверный email или пароль' };
  }

  await clearAttempts('login', ip, identifier);

  // Дальше решает middleware: 2FA не настроена → /admin/security,
  // настроена → /admin/login/mfa (ввод кода), иначе → /admin.
  redirect('/admin');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
