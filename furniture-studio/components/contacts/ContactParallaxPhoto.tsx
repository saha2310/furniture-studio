'use client';

import { useEffect, useRef } from 'react';

/**
 * Обёртка вокруг фото на странице контактов: при движении мыши картинка
 * слегка смещается относительно текста (2–8px, не настоящий parallax).
 * Отключается сама:
 *  - на тач-устройствах (нет mousemove — просто ничего не произойдёт),
 *  - если у пользователя prefers-reduced-motion,
 *  - без "грубого" указателя (проверка pointer: fine), чтобы не мешать
 *    на планшетах со стилусом/пальцем.
 */
export function ContactParallaxPhoto({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;

    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el!.style.setProperty('--parallax-x', `${(x * -8).toFixed(2)}px`);
        el!.style.setProperty('--parallax-y', `${(y * -8).toFixed(2)}px`);
      });
    }

    function handleLeave() {
      cancelAnimationFrame(frame);
      el!.style.setProperty('--parallax-x', '0px');
      el!.style.setProperty('--parallax-y', '0px');
    }

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={wrapRef} className="contact-parallax-wrap absolute inset-0 overflow-hidden">
      {children}
    </div>
  );
}
