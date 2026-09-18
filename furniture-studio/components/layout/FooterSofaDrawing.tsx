'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Тот же декоративный чертёж дивана, что был в футере статично, но теперь
 * "дорисовывается" линиями, когда футер впервые попадает в зону видимости
 * (IntersectionObserver, once — дальше просто остаётся дорисованным).
 * Сам SVG идентичен прежнему инлайн-варианту в Footer.tsx.
 */
export function FooterSofaDrawing({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="0 0 800 600"
      className={`footer-sofa-drawing pointer-events-none ${inView ? 'is-inview' : ''} ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {/* Размер по ширине */}
        <path d="M70 16H365" />
        <path d="M70 12v8M365 12v8" />
        {/* Подлокотники */}
        <rect x="48" y="80" width="28" height="58" rx="7" />
        <rect x="368" y="80" width="28" height="58" rx="7" />
        {/* Спинка */}
        <rect x="78" y="45" width="290" height="46" rx="8" />
        {/* Подушки спинки */}
        <rect x="85" y="53" width="88" height="36" rx="6" />
        <rect x="178" y="53" width="90" height="36" rx="6" />
        <rect x="273" y="53" width="88" height="36" rx="6" />
        {/* Сиденье */}
        <rect x="76" y="92" width="292" height="38" rx="5" />
        {/* Разделение сидений */}
        <path d="M173 94v34" />
        <path d="M271 94v34" />
        {/* Основание */}
        <path d="M76 130v16" />
        <path d="M368 130v16" />
        <path d="M76 146h292" />
        {/* Ножки */}
        <path d="M92 146v12" />
        <path d="M352 146v12" />
        {/* Линия глубины */}
        <path d="M92 158h260" />
        {/* Размер */}
        <text x="210" y="10" textAnchor="middle" className="fill-ink/25 text-[9px]">
          3200
        </text>
      </g>
    </svg>
  );
}
