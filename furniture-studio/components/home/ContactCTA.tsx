import Link from 'next/link';

function TechnicalSofaDrawing() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800"
      height="600"
      viewBox="0 0 800 600"
      className="h-auto w-full text-white/45"
      aria-label="Технический чертеж дивана"
      role="img"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M70 16H365" />
        <path d="M70 12v8M365 12v8" />
        <rect x="48" y="80" width="28" height="58" rx="7" />
        <rect x="368" y="80" width="28" height="58" rx="7" />
        <rect x="78" y="45" width="290" height="46" rx="8" />
        <rect x="85" y="53" width="88" height="36" rx="6" />
        <rect x="178" y="53" width="90" height="36" rx="6" />
        <rect x="273" y="53" width="88" height="36" rx="6" />
        <rect x="76" y="92" width="292" height="38" rx="5" />
        <path d="M173 94v34" />
        <path d="M271 94v34" />
        <path d="M76 130v16" />
        <path d="M368 130v16" />
        <path d="M76 146h292" />
        <path d="M92 146v12" />
        <path d="M352 146v12" />
        <path d="M92 158h260" />
        <text x="210" y="10" textAnchor="middle" className="fill-current text-[9px]">3200</text>
      </g>
    </svg>
  );
}

export function ContactCTA({ title }: { title?: string | null } = {}) {
  return (
    <section className="border-b border-white/10 bg-[#1c1b19]">
      <div className="container-studio grid items-center gap-12 py-20 lg:grid-cols-[1fr,1.2fr] lg:py-24">
        <div>
          <p className="eyebrow">контакты</p>
          <h2 className="display-title mt-5 max-w-[10ch]">{title || 'Расскажите о пространстве'}</h2>
          <p className="mt-7 max-w-[34ch] text-sm leading-6 text-espresso">Подберём лучшее решение для вашего интерьера и подготовимся к разговору по размерам и материалам.</p>
          <div className="mt-10 lg:hidden"><Link href="/contacts" className="reference-button">Обсудить проект</Link></div>
        </div>
        <div className="hidden lg:block lg:justify-self-center lg:max-w-[520px]">
          <TechnicalSofaDrawing />
        </div>
      </div>
    </section>
  );
}
