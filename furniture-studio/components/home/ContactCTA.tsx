import Link from 'next/link';

export function ContactCTA({ title }: { title?: string | null } = {}) {
  return (
    <section className="border-t border-stone/70">
      <div className="container-studio flex flex-col items-start gap-6 py-20 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-[20ch] text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
          {title || 'Обсудим ваш диван?'}
        </h2>
        <Link
          href="/contacts"
          className="inline-flex items-center justify-center rounded bg-ink px-7 py-3.5 text-[15px] text-canvas hover:bg-espresso"
        >
          Обсудить проект
        </Link>
      </div>
    </section>
  );
}
