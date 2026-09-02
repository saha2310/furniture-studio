import Link from 'next/link';
import { getSiteSettings, getContactLinks } from '@/lib/queries/site';
import { SocialIcon } from './SocialIcon';
import { formatPhoneForHref } from '@/lib/utils/format';

export async function Footer() {
  const [settings, contactLinks] = await Promise.all([getSiteSettings(), getContactLinks()]);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone/70 bg-surface">
      <div className="container-studio grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-lg">{settings?.company_name || 'Мастерская'}</p>
          <p className="mt-3 max-w-[32ch] text-sm text-espresso">
            Диваны и мягкая мебель на заказ — под конкретное пространство и задачу.
          </p>
        </div>

        <div>
          <p className="text-sm text-stone">Навигация</p>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/works" className="text-[15px] hover:text-walnut">Работы</Link>
            <Link href="/about" className="text-[15px] hover:text-walnut">О мастерской</Link>
            <Link href="/contacts" className="text-[15px] hover:text-walnut">Контакты</Link>
          </nav>
        </div>

        <div>
          <p className="text-sm text-stone">Контакты</p>
          <div className="mt-3 flex flex-col gap-2">
            {settings?.phone && (
              <a href={formatPhoneForHref(settings.phone)} className="text-[15px] hover:text-walnut">
                {settings.phone}
              </a>
            )}
            {settings?.email && (
              <a href={`mailto:${settings.email}`} className="text-[15px] hover:text-walnut">
                {settings.email}
              </a>
            )}
          </div>

          {contactLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {contactLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="flex h-9 w-9 items-center justify-center rounded border border-stone text-espresso hover:border-ink hover:text-ink"
                >
                  <SocialIcon platform={link.platform} className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-stone/70 py-5">
        <p className="container-studio text-xs text-stone">
          © {year} {settings?.company_name || 'Мастерская'}. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
