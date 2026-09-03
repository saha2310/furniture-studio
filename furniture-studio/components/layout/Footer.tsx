import Link from 'next/link';
import { getSiteSettings, getContactLinks, getMenuItems } from '@/lib/queries/site';
import { SocialIcon } from './SocialIcon';
import { formatPhoneForHref } from '@/lib/utils/format';

export async function Footer({ className = '' }: { className?: string }) {
  const [settings, contactLinks, menu] = await Promise.all([getSiteSettings(), getContactLinks(), getMenuItems()]);
  const year = new Date().getFullYear();
  const visibleMenu = menu.length ? menu : [
    { id: 'fallback-works', href: '/works', label: 'Работы' },
    { id: 'fallback-about', href: '/about', label: 'О мастерской' },
    { id: 'fallback-contacts', href: '/contacts', label: 'Контакты' },
  ];

  return (
    <footer className={`border-t border-white/10 bg-[#171716] ${className}`}>
      <div className="container-studio grid gap-12 py-14 lg:grid-cols-[1.2fr,.8fr,1fr,.9fr] lg:py-16">
        <div>
          <p className="font-display text-[28px] tracking-[-0.04em]">{settings?.company_name || 'УЮТ'}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone">мебель на заказ</p>
          <p className="mt-7 max-w-[34ch] text-sm leading-6 text-espresso">
            Диваны и мягкая мебель на заказ — под конкретное пространство и задачу.
          </p>
          {contactLinks.length > 0 && (
            <div className="mt-7 flex gap-2">
              {contactLinks.slice(0, 2).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="liquid-glass-social flex h-11 w-11 items-center justify-center text-stone"
                >
                  <SocialIcon platform={link.platform} className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow">Навигация</p>
          <nav className="mt-5 flex flex-col gap-3">
            {visibleMenu.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-espresso hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="eyebrow">Контакты</p>
          <div className="mt-5 flex flex-col gap-3 text-sm text-espresso">
            {settings?.phone && <a href={formatPhoneForHref(settings.phone)} className="hover:text-white">{settings.phone}</a>}
            {settings?.email && <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a>}
            {settings?.address && <p>{settings.address}</p>}
          </div>
        </div>

        <div className="flex items-end justify-end">
          <div className="w-full max-w-[280px]">
            <div className="relative aspect-[440/150] opacity-70">
              <svg viewBox="0 0 440 150" className="h-auto w-full text-white/35" aria-label="Технический чертеж дивана" role="img">
                <g fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="58" y="55" width="324" height="54" rx="6" />
                  <rect x="80" y="35" width="96" height="37" rx="6" />
                  <rect x="177" y="35" width="96" height="37" rx="6" />
                  <rect x="274" y="35" width="96" height="37" rx="6" />
                  <path d="M58 109v25M382 109v25M74 109v20M366 109v20M58 137h324M90 145h260" />
                  <path d="M58 18h324M58 14v8M382 14v8" />
                </g>
                <text x="220" y="12" textAnchor="middle" className="fill-current text-[11px]">3200</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-studio flex flex-col gap-3 py-5 text-[10px] text-stone sm:flex-row sm:items-center sm:justify-between">
          <p>© 2018–{year} {settings?.company_name || 'УЮТ'}. Все права защищены.</p>
          <span>Политика конфиденциальности</span>
        </div>
      </div>
    </footer>
  );
}
