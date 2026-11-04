import Image from 'next/image';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/queries/site';
import { siteAssetUrl, workImageUrl } from '@/lib/utils/image';
import type { HeroContent } from '@/types/domain';

const FALLBACK: HeroContent = {
  title: 'Мебель на заказ',
  description: 'Создаём мебель для вашего идеального дома',
  primaryCtaLabel: 'Обсудить проект',
  primaryCtaHref: '/contacts',
  secondaryCtaLabel: 'Переходите на сайт и выбирайте свою мебель',
  secondaryCtaHref: '/works',
  imagePath: null,
  imageOriginalPath: null,
};

/* Три преимущества под заголовком. Иконки — простые линии, цвет берут от текста. */
const FEATURES = [
  {
    label: ['Гарантия', 'качества'],
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" />
        <path d="m8.8 12 2.2 2.2 4.4-4.4" />
      </>
    ),
  },
  {
    label: ['Индивидуальные', 'решения'],
    icon: (
      <>
        <path d="M15.5 4.5 19.5 8.5 9 19H5v-4L15.5 4.5Z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
  },
  {
    label: ['Комфорт', 'в каждой детали'],
    icon: (
      <>
        <path d="M4 11 12 4l8 7" />
        <path d="M6 9.5V20h12V9.5" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
  },
];

export async function Hero({ content }: { content?: HeroContent | null }) {
  const data = content ?? FALLBACK;
  const settings = await getSiteSettings().catch(() => null);
  const companyName = settings?.company_name?.trim() || '';

  // Первое слово заголовка — жирным, остальное — тонким, как в макете.
  const title = (data.title || FALLBACK.title).trim();
  const spaceAt = title.indexOf(' ');
  const titleBold = spaceAt > 0 ? title.slice(0, spaceAt) : title;
  const titleLight = spaceAt > 0 ? title.slice(spaceAt + 1) : '';

  return (
    <section className="photo-hero relative min-h-[780px] overflow-hidden border-b border-ink/10 bg-canvas sm:min-h-[820px] lg:min-h-screen">
      {data.imagePath ? (
        <Image
          src={workImageUrl(data.imagePath)}
          alt="Мебель ручной работы в интерьере"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgb(var(--fallback-gradient-1))_0%,rgb(var(--fallback-gradient-2))_45%,rgb(var(--fallback-gradient-3))_78%)]" />
      )}
      <div className="absolute inset-0 bg-[rgb(var(--photo-mist)/0.45)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--photo-mist)/0.8),rgb(var(--photo-mist)/0.3),rgb(var(--photo-mist)/0.15))]" />

      <div className="light-image-content container-studio relative z-10 flex min-h-[780px] flex-col justify-center pb-24 pt-32 sm:min-h-[820px] lg:min-h-screen lg:pb-16 lg:pt-36">
        <div className="hero-brand-block w-full max-w-[460px]">
          {(settings?.logo_path || companyName) && (
            <div className="hero-in mb-9" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-4">
                {settings?.logo_path ? (
                  <span className="relative h-16 w-20 shrink-0 sm:h-20 sm:w-24">
                    <Image
                      src={siteAssetUrl(settings.logo_path)}
                      alt={companyName || 'Логотип мастерской'}
                      fill
                      sizes="96px"
                      className="object-contain object-left"
                    />
                  </span>
                ) : null}
                {companyName ? (
                  <span className="font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-ink sm:text-[52px]">
                    {companyName}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-ink/80 sm:text-[11px]">
                <span className="hero-accent-line h-[2px] w-7 shrink-0" />
                мебель для вашего уюта
                <span className="hero-accent-line h-[2px] w-7 shrink-0" />
              </p>
            </div>
          )}

          <h1 className="hero-in text-ink" style={{ animationDelay: '180ms' }}>
            <span className="block text-[64px] font-bold leading-[0.95] tracking-[-0.03em] sm:text-[84px]">{titleBold}</span>
            {titleLight ? (
              <span className="block text-[52px] font-light leading-[1.05] tracking-[-0.01em] sm:text-[68px]">{titleLight}</span>
            ) : null}
          </h1>

          {data.description ? (
            <p className="hero-in mt-6 max-w-[22rem] text-base leading-6 text-ink/80" style={{ animationDelay: '300ms' }}>
              {data.description}
            </p>
          ) : null}

          <ul className="hero-in mt-8 grid grid-cols-3 text-center" style={{ animationDelay: '400ms' }}>
            {FEATURES.map((f, i) => (
              <li key={f.label[0]} className={`flex flex-col items-center gap-2 px-2 ${i > 0 ? 'border-l border-ink/25' : ''}`}>
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {f.icon}
                </svg>
                <span className="text-[11px] leading-4 text-ink/80 sm:text-xs">
                  {f.label[0]}<br />{f.label[1]}
                </span>
              </li>
            ))}
          </ul>

          <div className="hero-in mt-9 flex flex-col gap-4" style={{ animationDelay: '500ms' }}>
            <Link
              href={data.secondaryCtaHref}
              className="hero-wide-button liquid-glass-on-image group flex items-center justify-between gap-4 rounded-full border border-ink/60 px-7 py-4 text-sm leading-5 text-ink transition-colors hover:border-ink"
            >
              <span className="flex-1 text-center">{data.secondaryCtaLabel}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </Link>
            <Link href={data.primaryCtaHref} className="reference-button liquid-glass-on-image self-start">
              {data.primaryCtaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
