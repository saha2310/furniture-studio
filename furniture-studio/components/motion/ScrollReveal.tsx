'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Плавное появление блоков при прокрутке.
 *
 * Разметка: data-reveal — блок «всплывает», когда попадает в экран;
 * data-reveal-stagger — то же, но дочерние элементы появляются по очереди
 * (карточки, шаги). Стили — в app/globals.css (раздел «Появление при прокрутке»).
 *
 * Скрытие до появления включается только классом html.motion-ok (ставит
 * инлайн-скрипт в app/layout.tsx), поэтому без JS или при «уменьшении
 * движения» в системе всё видно сразу. Если этот компонент по какой-то
 * причине не запустился, тот же скрипт через несколько секунд снимает
 * motion-ok — контент не останется невидимым.
 */
const SELECTOR = '[data-reveal],[data-reveal-stagger]';

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.revealReady = '1';

    const show = (el: Element) => el.classList.add('is-revealed');

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll(SELECTOR).forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    const observeAll = (scope: ParentNode) => {
      scope.querySelectorAll(SELECTOR).forEach((el) => {
        if (!el.classList.contains('is-revealed')) io.observe(el);
      });
    };
    observeAll(document);

    // Новые блоки, появившиеся без смены адреса (например, «Листать далее»).
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR) && !node.classList.contains('is-revealed')) io.observe(node);
          observeAll(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
