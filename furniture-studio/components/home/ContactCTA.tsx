import Link from 'next/link';

export function ContactCTA({ title }: { title?: string | null } = {}) {
  return (
    <section className="border-b border-white/10 bg-[#1c1b19]">
      <div className="container-studio grid items-center gap-12 py-20 lg:grid-cols-[1fr,.8fr,1fr] lg:py-24">
        <div>
          <p className="eyebrow">контакты</p>
          <h2 className="display-title mt-5 max-w-[10ch]">{title || 'Расскажите о пространстве'}</h2>
          <p className="mt-7 max-w-[34ch] text-sm leading-6 text-espresso">Подберём лучшее решение для вашего интерьера и подготовимся к разговору по размерам и материалам.</p>
        </div>
        <div className="lg:justify-self-center"><Link href="/contacts" className="reference-button">Обсудить проект <span>→</span></Link></div>
        <div className="hidden lg:block">
          <svg viewBox="0 0 440 150" className="h-auto w-full text-white/35" aria-label="Технический чертеж дивана" role="img">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="58" y="55" width="324" height="54" rx="6" />
              <rect x="80" y="35" width="96" height="37" rx="6" /><rect x="177" y="35" width="96" height="37" rx="6" /><rect x="274" y="35" width="96" height="37" rx="6" />
              <path d="M58 109v25M382 109v25M74 109v20M366 109v20M58 137h324M90 145h260" />
              <path d="M58 18h324M58 14v8M382 14v8" />
            </g>
            <text x="220" y="12" textAnchor="middle" className="fill-current text-[11px]">3200</text>
          </svg>
        </div>
      </div>
    </section>
  );
}
