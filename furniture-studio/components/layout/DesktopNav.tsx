'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function DesktopNav({ links }: { links: { id: string; href: string; label: string }[] }) {
  const pathname = usePathname();
  return <nav className="hidden items-center gap-7 lg:flex">{links.map(link => {
    const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
    return <Link key={link.id} href={link.href} aria-current={active ? 'page' : undefined} className={`relative py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${active ? 'text-white after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-white' : 'text-white/65 hover:text-white'}`}>{link.label}</Link>;
  })}</nav>;
}
