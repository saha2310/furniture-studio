import type { Metadata } from 'next';
import { getSiteSettings, getContactLinks } from '@/lib/queries/site';
import { ContactForm } from '@/components/forms/ContactForm';
import { SocialIcon } from '@/components/layout/SocialIcon';
import { formatPhoneForHref } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Свяжитесь с мастерской, чтобы обсудить диван или кресло на заказ.',
};

export default async function ContactsPage() {
  const [settings, contactLinks] = await Promise.all([getSiteSettings(), getContactLinks()]);

  return (
    <div className="container-studio py-14">
      <h1 className="text-[clamp(1.8rem,4vw,2.75rem)] leading-tight">Обсудить проект</h1>
      <p className="mt-4 max-w-prose text-lg text-espresso">
        Оставьте заявку, и мы свяжемся, чтобы обсудить пространство, форму и материалы.
      </p>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr,1.2fr]">
        <div>
          <div className="flex flex-col gap-3">
            {settings?.phone && (
              <a href={formatPhoneForHref(settings.phone)} className="text-lg hover:text-walnut">
                {settings.phone}
              </a>
            )}
            {settings?.email && (
              <a href={`mailto:${settings.email}`} className="text-lg hover:text-walnut">
                {settings.email}
              </a>
            )}
            {settings?.address && <p className="text-[15px] text-espresso">{settings.address}</p>}
          </div>

          {contactLinks.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-stone">Мы также на связи в</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {contactLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border border-stone px-4 py-2.5 text-[15px] hover:border-ink"
                  >
                    <SocialIcon platform={link.platform} className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded border border-stone/70 p-6 sm:p-8">
          <ContactForm sourcePage="contacts" />
        </div>
      </div>
    </div>
  );
}
