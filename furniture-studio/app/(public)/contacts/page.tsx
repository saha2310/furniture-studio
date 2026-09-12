import type { Metadata } from 'next';
import Image from 'next/image';
import { getSiteSettings, getContactLinks } from '@/lib/queries/site';
import { getHomeSections } from '@/lib/queries/home';
import { SocialIcon } from '@/components/layout/SocialIcon';
import { ContactParallaxPhoto } from '@/components/contacts/ContactParallaxPhoto';
import { ContactCarousel } from '@/components/contacts/ContactCarousel';
import { formatPhoneForHref } from '@/lib/utils/format';
import { workImageUrl, siteAssetUrl } from '@/lib/utils/image';

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Свяжитесь с мастерской, чтобы обсудить диван или кресло на заказ.',
};

type Channel = {
  key: string;
  platform: string;
  title: string;
  description?: string;
  href: string;
  external?: boolean;
};

export default async function ContactsPage() {
  const [settings, contactLinks, sections] = await Promise.all([getSiteSettings(), getContactLinks(), getHomeSections()]);
  const hero = sections.find((section) => section.key === 'hero');
  const gallerySection = sections.find((section) => section.key === 'contacts_gallery');
  const galleryImages = ((gallerySection?.content_json as { images?: { bucket: 'works' | 'site'; path: string }[] } | null)?.images ?? []).map((img) => ({
    url: img.bucket === 'works' ? workImageUrl(img.path) : siteAssetUrl(img.path),
    alt: 'Интерьер мастерской',
  }));

  // Единый список каналов связи — рендерится один раз, справа. Слева (на фото)
  // контакты больше не дублируются: см. концепт заказчика — «контакты должны
  // быть одним главным действием, а не дублироваться в трёх местах».
  // Телефон из общих настроек — это запасной вариант для сайтов, где ещё не
  // завели ни одного номера через «Способы связи» (там поддерживается сколько
  // угодно номеров, каждый со своей подписью). Как только там появится хотя бы
  // один телефон — этот, из настроек, больше не показываем, чтобы не задваивать.
  const hasPhoneContactLink = contactLinks.some((link) => link.platform === 'phone');
  const channels: Channel[] = [
    ...(hasPhoneContactLink
      ? []
      : (settings?.phone ?? '')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((phone): Channel => ({ key: `phone-${phone}`, platform: 'phone', title: 'Позвонить', description: phone, href: formatPhoneForHref(phone) }))),
    ...contactLinks.map((link): Channel => ({ key: `link-${link.id}`, platform: link.platform, title: link.label, href: link.url, external: true })),
    ...(settings?.email ? [{ key: 'email', platform: 'email', title: 'Email', description: settings.email, href: `mailto:${settings.email}` }] : []),
  ];

  return (
    <div className="pt-[82px]">
      <section className="grid min-h-[calc(100vh-82px)] lg:grid-cols-2">
        <div className="relative min-h-[620px] overflow-hidden border-b border-ink/10 lg:border-b-0 lg:border-r">
          <div className="contact-photo-in absolute inset-0">
            <ContactParallaxPhoto>
              {galleryImages.length > 0 ? (
                <ContactCarousel images={galleryImages} />
              ) : hero?.content_json && typeof (hero.content_json as { imagePath?: unknown }).imagePath === 'string' ? (
                <Image src={workImageUrl((hero.content_json as { imagePath: string }).imagePath)} alt="Интерьер мастерской" fill priority sizes="50vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgb(var(--fallback-gradient-1)),rgb(var(--fallback-gradient-2))_45%,rgb(var(--fallback-gradient-3))_75%)]" />
              )}
            </ContactParallaxPhoto>
            <div className="absolute inset-0 bg-black/50" />
          </div>

          <div className="light-image-content relative z-10 flex h-full flex-col justify-end p-7 pb-12 sm:p-10 lg:p-14">
            <p className="contact-fade-up eyebrow text-ink/50" style={{ animationDelay: '80ms' }}>контакты</p>
            <h1 className="contact-fade-up mt-5 max-w-[9ch] text-[clamp(3rem,6.2vw,5.6rem)] leading-[.94] tracking-[-.04em] text-ink" style={{ animationDelay: '180ms' }}>
              Есть пространство.
              <br />
              Придумаем мебель.
            </h1>
            <span className="contact-fade-up mt-8 h-px w-12 bg-ink/40" style={{ animationDelay: '340ms' }} />
            <p className="contact-fade-up mt-6 max-w-[36ch] text-sm leading-6 text-ink/65" style={{ animationDelay: '400ms' }}>
              Расскажите, что нужно сделать. Мы обсудим размеры, форму, материалы и предложим решение.
            </p>

            <div className="contact-fade-up contact-scroll-hint-glow mt-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink/85 lg:hidden" style={{ animationDelay: '520ms' }}>
              <svg className="contact-scroll-hint-arrow" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 4v11M5 11l5 5 5-5" />
              </svg>
              прокрутите вниз
            </div>
          </div>
        </div>

        <div className="flex items-center bg-surface px-7 py-14 sm:px-10 lg:px-14">
          <div className="w-full max-w-[560px]">
            <div className="mb-10">
              <p className="contact-fade-up eyebrow" style={{ animationDelay: '560ms' }}>связаться с нами</p>
              <p className="contact-fade-up mt-4 text-sm leading-6 text-ink/60" style={{ animationDelay: '620ms' }}>
                Выберите удобный способ связи — ответим лично, без форм и заявок.
              </p>
            </div>

            <div className="flex flex-col">
              {channels.map((channel, index) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noopener noreferrer' : undefined}
                  className="contact-fade-up group flex items-center gap-4 border-b border-ink/10 py-5 transition-[padding] duration-300 first:border-t hover:pl-2"
                  style={{ animationDelay: `${680 + index * 90}ms` }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition-colors duration-300 group-hover:border-ink/40 group-hover:text-ink">
                    <SocialIcon platform={channel.platform} className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-base text-ink transition-colors duration-300">{channel.title}</span>
                    {channel.description && <span className="mt-0.5 block text-xs text-ink/50">{channel.description}</span>}
                  </span>
                  <span className="text-lg text-ink/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-ink">→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
