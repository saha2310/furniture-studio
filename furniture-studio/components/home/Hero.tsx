import Image from 'next/image';
import Link from 'next/link';
import { workImageUrl } from '@/lib/utils/image';
import type { HeroContent } from '@/types/domain';

const FALLBACK: HeroContent = {
  title: 'Диваны под пространство.',
  description: 'Создаём мягкую мебель по индивидуальным размерам и вашим пожеланиям.',
  primaryCtaLabel: 'Обсудить проект',
  primaryCtaHref: '/contacts',
  secondaryCtaLabel: 'Посмотреть работы',
  secondaryCtaHref: '/works',
  imagePath: null,
};

export function Hero({ content }: { content?: HeroContent | null }) {
  const data = content ?? FALLBACK;

  return (
    <section className="relative min-h-[780px] overflow-hidden border-b border-white/10 bg-[#111110] sm:min-h-[820px] lg:min-h-screen">
      {data.imagePath ? (
        <Image
          src={workImageUrl(data.imagePath)}
          alt="Диван ручной работы в интерьере"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,#47413a_0%,#211f1c_45%,#111110_78%)]" />
      )}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/15" />

      <div className="container-studio relative z-10 flex min-h-[780px] flex-col justify-between pb-9 pt-36 sm:min-h-[820px] lg:min-h-screen lg:pb-12 lg:pt-40">
        <div className="max-w-[780px]">
          <p className="eyebrow mb-7 flex items-center gap-4 text-white/55">
            <span className="h-px w-10 bg-white/35" /> мебель на заказ
          </p>
          <h1 className="editorial-title max-w-[10ch] text-white">{data.title || FALLBACK.title}</h1>
          <div className="mt-8 max-w-[34rem] border-l border-white/20 pl-5 text-sm leading-6 text-white/70">
            {data.description}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={data.primaryCtaHref} className="reference-button liquid-glass-on-image">
              {data.primaryCtaLabel}
            </Link>
            <Link href={data.secondaryCtaHref} className="reference-button liquid-glass-on-image">
              {data.secondaryCtaLabel}
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6 text-white/65">
          <div className="flex items-center gap-4 text-[12px] tracking-[0.12em]">
            <span className="text-white">01</span>
            <span className="h-px w-16 bg-white/25" />
            <span>06</span>
          </div>
          <div className="hidden text-right text-[9px] uppercase leading-5 tracking-[0.16em] sm:block">
            private residence<br />диван / индивидуальное изготовление
          </div>
        </div>
      </div>
    </section>
  );
}
