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

    // Что именно отслеживаем: обычный блок [data-reveal] — сам блок,
    // а у [data-reveal-stagger] — каждую карточку отдельно. Раньше следили
    // за всей сеткой целиком с порогом 12%: на телефоне длинная сетка работ
    // (одна колонка) долго не набирала 12% на экране, и казалось, что там пусто.
    const targetsIn = (scope: ParentNode): Element[] => {
      const out: Element[] = [];
      const visit = (el: Element) => {
        if (el.hasAttribute('data-reveal-stagger')) {
          Array.from(el.children).forEach((child) => out.push(child));
        } else if (el.hasAttribute('data-reveal')) {
          out.push(el);
        }
      };
      if (scope instanceof Element && scope.matches(SELECTOR)) visit(scope);
      scope.querySelectorAll(SELECTOR).forEach(visit);
      return out;
    };

    if (!('IntersectionObserver' in window)) {
      targetsIn(document).forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        // Карточки, появившиеся одновременно, всплывают лесенкой (по 90 мс).
        let batchIndex = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (el.parentElement?.hasAttribute('data-reveal-stagger')) {
            el.style.transitionDelay = `${Math.min(batchIndex, 5) * 90}ms`;
            batchIndex += 1;
          }
          show(el);
          io.unobserve(el);
        }
      },
      // Срабатывает, как только край блока показался на экране.
      { threshold: 0, rootMargin: '0px 0px -40px 0px' },
    );

    const observeAll = (scope: ParentNode) => {
      targetsIn(scope).forEach((el) => {
        if (!el.classList.contains('is-revealed')) io.observe(el);
      });
    };
    observeAll(document);

    // Новые блоки и карточки, появившиеся без смены адреса (например, «Листать далее»).
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          const parent = node.parentElement;
          if (parent?.hasAttribute('data-reveal-stagger') && !node.classList.contains('is-revealed')) io.observe(node);
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
