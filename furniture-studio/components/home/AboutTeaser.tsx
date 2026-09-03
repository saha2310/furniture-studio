import Link from 'next/link';

export function AboutTeaser({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
  return (
    <section className="border-b border-white/10 bg-[#151514]">
      <div className="container-studio grid gap-12 py-24 lg:grid-cols-[.8fr,1.2fr] lg:gap-24 lg:py-28">
        <div>
          <p className="eyebrow">мастерская</p>
          <h2 className="display-title mt-6 max-w-[8ch]">{title || 'Здесь создаётся качество'}</h2>
        </div>
        <div className="flex flex-col justify-end">
          <p className="max-w-[48ch] text-[15px] leading-7 text-espresso">{subtitle || 'Небольшая команда, которая проектирует и изготавливает мягкую мебель на заказ — от каркаса до финальной обивки.'}</p>
          <div className="mt-12 flex items-end justify-between border-t border-white/10 pt-6">
            <div><span className="text-5xl tracking-[-0.05em]">12</span><span className="ml-2 text-xs text-stone">лет опыта</span></div>
            <Link href="/about" className="group about-teaser-button text-[11px] uppercase tracking-[0.14em] text-espresso hover:text-white">Подробнее о мастерской</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
