import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/layout/AdminMobileNav';

// Middleware уже защищает /admin/* на уровне edge, эта проверка — второй рубеж
// (defense in depth, п.15) на случай прямого рендера страницы. Эта layout находится
// в route group (dashboard), поэтому НЕ оборачивает /admin/login — там своя,
// отдельная страница без сайдбара, иначе редирект зациклился бы.
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <AdminMobileNav />
      <main className="flex-1 bg-canvas px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
