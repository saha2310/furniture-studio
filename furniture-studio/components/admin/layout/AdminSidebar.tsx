import Link from 'next/link';
import { logout } from '@/lib/actions/auth';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/works', label: 'Работы' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/home', label: 'Главная' },
  { href: '/admin/about', label: 'О компании' },
  { href: '/admin/contacts', label: 'Заявки' },
  { href: '/admin/settings', label: 'Настройки' },
];

export function AdminSidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col justify-between border-r border-stone/70 bg-canvas px-4 py-6">
      <div>
        <Link href="/admin" className="px-2 font-display text-lg">
          Админка
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2.5 text-[15px] text-espresso hover:bg-surface hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <form action={logout}>
        <button type="submit" className="w-full rounded px-3 py-2.5 text-left text-sm text-stone hover:bg-surface hover:text-ink">
          Выйти
        </button>
      </form>
    </aside>
  );
}
