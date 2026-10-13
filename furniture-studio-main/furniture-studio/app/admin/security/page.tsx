import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminAccess } from '@/lib/auth/admin-access';
import { logout } from '@/lib/actions/auth';
import { MfaSetup } from '@/components/admin/security/MfaSetup';

// Стоит вне route group (dashboard): если 2FA ещё не настроена, остальная админка
// закрыта, а эта страница должна открываться. Первичную маршрутизацию делает
// middleware, здесь — повторная проверка.
export default async function SecurityPage() {
  const supabase = await createClient();
  const { access } = await getAdminAccess(supabase.auth);

  if (access === 'anonymous') redirect('/admin/login');
  if (access === 'needs_mfa_code') redirect('/admin/login/mfa');

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl">Двухфакторная защита</h1>

        {access === 'ok' ? (
          <>
            <p className="mt-4 text-sm text-espresso">
              Включена. При каждом входе, кроме пароля, нужен 6-значный код из приложения-аутентификатора на вашем телефоне.
            </p>
            <p className="mt-3 text-sm text-espresso">
              Если потеряете телефон, сбросьте второй фактор в панели Supabase: Authentication → Users → ваш пользователь.
            </p>
            <Link href="/admin" className="mt-6 inline-block text-sm underline">
              ← В админку
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-espresso">
              Чтобы войти в админку, нужно один раз подключить приложение-аутентификатор.
            </p>
            <MfaSetup />
            <form action={logout} className="mt-8">
              <button type="submit" className="text-sm text-espresso underline">
                Выйти
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
