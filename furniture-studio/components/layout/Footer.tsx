import Link from 'next/link';
import { getSiteSettings, getContactLinks, getMenuItems } from '@/lib/queries/site';
import { SocialIcon } from './SocialIcon';
import { FooterSofaDrawing } from './FooterSofaDrawing';
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
    <footer className={`border-t border-ink/10 bg-surface ${className}`}>
      {/* relative+overflow-hidden ограничены этим блоком, а не всем футером —
          так декоративная подложка не может залезть на нижнюю строку с копирайтом */}
      <div className="relative overflow-hidden">
        {/* Технический чертёж дивана — чисто декоративный акцент под тему сайта.
            aria-hidden + pointer-events-none: не мешает ни скринридерам, ни кликам,
            z-0 держит его строго под текстовым контентом (тот — z-10). */}
        <FooterSofaDrawing className="absolute -right-[210px] bottom-0 z-0 hidden w-[420px] translate-y-6 text-ink/20 lg:block xl:-right-[225px] xl:w-[460px] 2xl:-right-[210px]" />

        <div className="container-studio relative z-10 grid gap-12 py-14 lg:grid-cols-[1.2fr,.8fr,1fr] lg:py-16">
          <div>
            <p className="font-display text-[28px] tracking-[-0.04em]">{settings?.company_name || 'УЮТ'}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-stone">мебель на заказ</p>
            <p className="mt-7 max-w-[34ch] text-sm leading-6 text-espresso">
              Диваны и мягкая мебель на заказ — под конкретное пространство и задачу.
            </p>
            {contactLinks.length > 0 && (
              <div className="mt-7 flex gap-2">
                {contactLinks.map((link) => (
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
                <Link key={link.href} href={link.href} className="text-sm text-espresso hover:text-ink">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="eyebrow">Контакты</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-espresso">
              {settings?.phone && <a href={formatPhoneForHref(settings.phone)} className="hover:text-ink">{settings.phone}</a>}
              {settings?.email && <a href={`mailto:${settings.email}`} className="hover:text-ink">{settings.email}</a>}
              {settings?.address && <p>{settings.address}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="container-studio flex flex-col gap-3 py-5 text-[10px] text-stone sm:flex-row sm:items-center sm:justify-between">
          <p>© 2018–{year} {settings?.company_name || 'УЮТ'}. Все права защищены.</p>
          <Link href="/privacy" className="hover:text-ink">Политика обработки персональных данных</Link>
        </div>
      </div>
    </footer>
  );
}
