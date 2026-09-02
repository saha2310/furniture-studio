import Link from 'next/link';

export function AboutTeaser({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
  return (
    <section className="container-studio py-20">
      <div className="grid gap-8 md:grid-cols-[1fr,1.4fr] md:gap-16">
        <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
          {title || 'О мастерской'}
        </h2>
        <div>
          <p className="max-w-prose text-[17px] text-espresso">
            {subtitle ||
              'Небольшая команда, которая занимается мягкой мебелью — без посредников между вами и человеком, который шьёт диван. Каждое изделие мы делаем от начала до конца сами и отвечаем за результат.'}
          </p>
          <Link href="/about" className="mt-5 inline-block text-[15px] text-walnut underline-offset-4 hover:text-walnutDark hover:underline">
            Подробнее о мастерской
          </Link>
        </div>
      </div>
    </section>
  );
}
