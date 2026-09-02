import Image from 'next/image';
import Link from 'next/link';
import { workImageUrl } from '@/lib/utils/image';
import type { HeroContent } from '@/types/domain';

const FALLBACK: HeroContent = {
  title: 'Диваны, которые сделаны под ваше пространство',
  description:
    'Мы проектируем и шьём мягкую мебель индивидуально — под размеры комнаты, характер интерьера и то, как вы им пользуетесь.',
  primaryCtaLabel: 'Обсудить проект',
  primaryCtaHref: '/contacts',
  secondaryCtaLabel: 'Посмотреть работы',
  secondaryCtaHref: '/works',
  imagePath: null,
};

export function Hero({ content }: { content?: HeroContent | null }) {
  const data = content ?? FALLBACK;

  return (
    <section className="border-b border-stone/70">
      <div className="grid md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-5 py-14 sm:px-8 md:order-1 md:py-0 md:pl-8 md:pr-10 lg:pl-[max(2rem,calc((100vw-1240px)/2))]">
          <h1 className="max-w-[16ch] text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] tracking-tight">
            {data.title}
          </h1>
          <p className="mt-6 max-w-prose text-lg text-espresso">{data.description}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href={data.primaryCtaHref}
              className="inline-flex items-center justify-center rounded bg-ink px-6 py-3.5 text-[15px] text-canvas hover:bg-espresso"
            >
              {data.primaryCtaLabel}
            </Link>
            <Link
              href={data.secondaryCtaHref}
              className="inline-flex items-center justify-center rounded border border-ink px-6 py-3.5 text-[15px] text-ink hover:bg-ink hover:text-canvas"
            >
              {data.secondaryCtaLabel}
            </Link>
          </div>
        </div>

        <div className="relative order-1 aspect-[4/3] md:order-2 md:aspect-auto">
          {data.imagePath ? (
            <Image
              src={workImageUrl(data.imagePath)}
              alt="Диван ручной работы в интерьере"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center bg-surface text-sm text-stone">
              Фото не загружено — добавьте в /admin/home
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
