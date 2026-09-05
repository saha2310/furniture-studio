import type { Metadata } from 'next';
import Image from 'next/image';
import { getSiteSettings, getContactLinks } from '@/lib/queries/site';
import { getHomeSections } from '@/lib/queries/home';
import { ContactForm } from '@/components/forms/ContactForm';
import { SocialIcon } from '@/components/layout/SocialIcon';
import { formatPhoneForHref } from '@/lib/utils/format';
import { workImageUrl } from '@/lib/utils/image';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Свяжитесь с мастерской, чтобы обсудить диван или кресло на заказ.',
};

export default async function ContactsPage() {
  const [settings, contactLinks, sections] = await Promise.all([getSiteSettings(), getContactLinks(), getHomeSections()]);
  const hero = sections.find((section) => section.key === 'hero');

  return (
    <div className="pt-[82px]">
      <section className="grid min-h-[calc(100vh-82px)] lg:grid-cols-2">
        <div className="relative min-h-[620px] overflow-hidden border-b border-ink/10 lg:border-b-0 lg:border-r">
          {hero?.content_json && typeof (hero.content_json as { imagePath?: unknown }).imagePath === 'string' ? (
            <Image src={workImageUrl((hero.content_json as { imagePath: string }).imagePath)} alt="Интерьер мастерской" fill priority sizes="50vw" className="object-cover" />
          ) : <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgb(var(--fallback-gradient-1)),rgb(var(--fallback-gradient-2))_45%,rgb(var(--fallback-gradient-3))_75%)]" />}
          <div className="absolute inset-0 bg-black/50" />
          <div className="light-image-content relative z-10 flex h-full flex-col justify-end p-7 pb-12 sm:p-10 lg:p-14">
            <p className="eyebrow text-ink/50">контакты</p>
            <h1 className="mt-5 max-w-[8ch] text-[clamp(3.8rem,7vw,7rem)] leading-[.86] tracking-[-.05em] text-ink">Обсудить проект</h1>
            <span className="mt-10 h-px w-12 bg-ink/40" />
            <p className="mt-6 max-w-[34ch] text-sm leading-6 text-ink/65">Оставьте заявку, и мы свяжемся с вами, чтобы обсудить пространство, форму и материалы.</p>
            {contactLinks.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow text-ink/40">мы также на связи в</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {contactLinks.map((link) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="liquid-glass-social px-4 py-2.5 text-xs">
                      <SocialIcon platform={link.platform} className="h-4 w-4" />{link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-10 flex flex-col gap-2 text-sm text-ink/60">
              {settings?.phone && <a href={formatPhoneForHref(settings.phone)} className="hover:text-ink">{settings.phone}</a>}
              {settings?.email && <a href={`mailto:${settings.email}`} className="hover:text-ink">{settings.email}</a>}
            </div>
          </div>
        </div>

        <div className="flex items-center bg-surface px-7 py-14 sm:px-10 lg:px-14">
          <div className="w-full max-w-[560px]">
            <div className="mb-12">
              <p className="eyebrow">заявка</p>
              <p className="mt-4 text-3xl tracking-[-0.035em]">Расскажите о задаче</p>
            </div>
            <ContactForm sourcePage="contacts" />
          </div>
        </div>
      </section>
    </div>
  );
}
