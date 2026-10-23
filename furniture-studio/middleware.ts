import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveAdminAccess } from '@/lib/auth/admin-access';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // anonymous / needs_mfa_setup / needs_mfa_code / ok — см. lib/auth/admin-access.ts
  const access = await resolveAdminAccess(supabase.auth, user);

  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/admin/login';
  const isMfaCode = pathname === '/admin/login/mfa';
  const isSecurity = pathname === '/admin/security';

  // Редирект с сохранением обновлённых cookies сессии (иначе при обновлении
  // токена на редиректе новая сессия потерялась бы).
  const go = (path: string, next?: string) => {
    const url = new URL(path, request.url);
    if (next) url.searchParams.set('next', next);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  switch (access) {
    case 'anonymous':
      if (isLogin) return response;
      return isMfaCode ? go('/admin/login') : go('/admin/login', pathname);

    case 'needs_mfa_code':
      // Пароль введён, нужен код: доступна только страница ввода кода.
      return isMfaCode ? response : go('/admin/login/mfa');

    case 'needs_mfa_setup':
      // 2FA ещё не настроена: доступна только страница настройки.
      return isSecurity ? response : go('/admin/security');

    case 'ok':
      return isLogin || isMfaCode ? go('/admin') : response;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
