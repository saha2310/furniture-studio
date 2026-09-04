'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const CONTACT_CTA_IMAGE = '/images/contact-cta-sofa.webp';

export function ContactCTA({ title }: { title?: string | null } = {}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener?.('change', updateMotionPreference);
    return () => media.removeEventListener?.('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType !== 'mouse') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 4;
    setImageOffset({ x, y });
  }

  function resetImageOffset() {
    setImageOffset({ x: 0, y: 0 });
  }

  return (
    <section ref={sectionRef} className="relative border-b border-white/10 bg-[#1c1b19]">
      {/*
        Раньше эта обёртка сидела ВНУТРИ container-studio (max-w-[1440px]) и была
        шириной w-[50vw] — на широких экранах контейнер упирался в свой максимум
        раньше, чем набегало 50vw, и между картинкой и настоящим правым краем
        экрана оставался пустой (тёмный) промежуток. Теперь блок — прямой ребёнок
        <section>, у которой нет max-width, поэтому inset-y-0 right-0 w-1/2 всегда
        физически касается правого края экрана, на любой ширине.
      */}
      <div
        className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden rounded-l-[20px] lg:block"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetImageOffset}
        aria-hidden="true"
        style={{
          clipPath: reducedMotion || visible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: reducedMotion ? 'none' : 'clip-path 1150ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <Image
          src={CONTACT_CTA_IMAGE}
          alt="Современный диван в спокойном интерьере"
          fill
          sizes="50vw"
          className="object-cover object-center"
          style={{
            transform: `translate3d(${imageOffset.x}px, ${imageOffset.y}px, 0) scale(1.012)`,
            transition: reducedMotion ? 'none' : 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      <div className="container-studio relative z-10 grid lg:min-h-[560px] lg:grid-cols-2 lg:items-stretch lg:gap-10 lg:py-0">
        <div className="flex flex-col justify-center py-20 lg:py-24">
          <div
            className={reducedMotion || visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
            style={{
              transitionProperty: 'opacity, transform',
              transitionDuration: reducedMotion ? '0ms' : '800ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <p className="eyebrow">контакты</p>
            <h2 className="display-title mt-5 max-w-[10ch]">{title || 'Расскажите о пространстве'}</h2>
            <p className="mt-7 max-w-[34ch] text-sm leading-6 text-espresso">
              Подберём лучшее решение для вашего интерьера и подготовимся к разговору по размерам и материалам.
            </p>

            <div
              className={reducedMotion || visible ? 'mt-10 opacity-100 translate-y-0' : 'mt-10 opacity-0 translate-y-4'}
              style={{
                transitionProperty: 'opacity, transform',
                transitionDuration: reducedMotion ? '0ms' : '650ms',
                transitionDelay: reducedMotion ? '0ms' : '180ms',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Link href="/contacts" className="reference-button liquid-glass-on-dark">
                Обсудить проект
              </Link>
            </div>
          </div>
        </div>

        {/* Пустая колонка-распорка: держит текст в левой половине контейнера,
            саму картинку теперь рисует блок выше, вне container-studio. */}
        <div className="hidden lg:block" aria-hidden="true" />
      </div>
    </section>
  );
}
