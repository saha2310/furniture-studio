'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// useLayoutEffect даёт предупреждение при серверном рендере — на сервере
// подменяем его обычным useEffect (там он всё равно не выполняется).
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const DURATION_MS = 1600;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Число «набегает» от нуля, когда блок появляется на экране.
 * Понимает строки вида "18", "20%", "7–21": все числа внутри анимируются,
 * остальной текст остаётся как есть. На сервере (и без JS) сразу выводится
 * итоговое значение.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(1);

  useIsoLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setProgress(0);
    let frame = 0;

    const start = () => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / DURATION_MS);
        setProgress(easeOutCubic(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      start();
      return () => cancelAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          start();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const text = value.replace(/\d+/g, (num) => String(Math.round(Number(num) * progress)));

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}
