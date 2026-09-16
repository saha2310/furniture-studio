'use client';

import { useEffect, useState } from 'react';

// Показывается поверх всего сайта, только когда переход между страницами
// (клик по ссылке) занимает заметное время — см. NavigationLoadingIndicator.
// Сама иллюстрация и тайминги анимаций — как в присланном макете, классы
// префиксованы `route-loader-*`, чтобы не пересекаться с остальной вёрсткой.
export function RouteLoadingCat({ visible }: { visible: boolean }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!visible) {
      setDots('');
      return;
    }
    let count = 0;
    const id = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, 400);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div className={`route-loader ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <div className="route-loader-panel">
        <div className="route-loader-scene">
          <div className="route-loader-ground" />
          <div className="route-loader-shadow" />

          <div className="route-loader-cat">
            <svg width="160" height="100" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
              <g className="route-loader-cat-character">
                <g className="route-loader-tail">
                  <path
                    d="M42 58 C20 59 8 45 16 29 C21 18 34 15 40 23 C45 30 39 39 32 37"
                    fill="none"
                    stroke="#D77A32"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <path d="M17 31 L27 35" fill="none" stroke="#392319" strokeWidth="4" strokeLinecap="round" />
                  <path d="M17 42 L27 45" fill="none" stroke="#392319" strokeWidth="4" strokeLinecap="round" />
                </g>

                <g className="route-loader-back-left">
                  <path
                    d="M42 64 L40 78 C37 82 39 85 44 85 L52 84 C55 83 54 80 51 77 L54 63"
                    fill="#D77A32"
                    stroke="#251A14"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </g>

                <g className="route-loader-front-right-back">
                  <path
                    d="M99 61 L102 77 C100 81 103 84 108 83 L115 82 C118 81 117 78 114 75 L112 59"
                    fill="#D77A32"
                    stroke="#251A14"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </g>

                <path
                  d="M39 35 C49 27 68 26 84 32 C99 37 108 48 108 59 C108 68 100 73 88 73 L48 73 C34 72 27 63 29 51 C30 43 34 38 39 35 Z"
                  fill="#D77A32"
                  stroke="#251A14"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                <path d="M48 31 L53 46" stroke="#392319" strokeWidth="5" strokeLinecap="round" />
                <path d="M61 29 L65 43" stroke="#392319" strokeWidth="5" strokeLinecap="round" />
                <path d="M74 30 L77 42" stroke="#392319" strokeWidth="5" strokeLinecap="round" />

                <g className="route-loader-front-left">
                  <path
                    d="M88 62 L88 78 C85 82 88 85 93 84 L101 83 C104 82 103 79 100 76 L102 61"
                    fill="#D77A32"
                    stroke="#251A14"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </g>

                <g className="route-loader-back-right-front">
                  <path
                    d="M54 65 L52 79 C49 82 52 85 57 84 L64 83 C67 82 66 79 63 76 L66 64"
                    fill="#D77A32"
                    stroke="#251A14"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                </g>

                <path
                  d="M91 25 L94 7 L104 19 C111 15 120 16 125 20 L136 9 L134 29 C140 36 140 47 135 54 C129 63 115 64 104 59 C95 55 90 47 89 37 Z"
                  fill="#DF8036"
                  stroke="#251A14"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                <path d="M97 12 L99 22 L94 18 Z" fill="#E7A078" />
                <path d="M130 15 L132 23 L126 20 Z" fill="#E7A078" />

                <path d="M104 19 L106 30" stroke="#392319" strokeWidth="4" strokeLinecap="round" />
                <path d="M112 18 L114 29" stroke="#392319" strokeWidth="4" strokeLinecap="round" />
                <path d="M120 20 L119 30" stroke="#392319" strokeWidth="4" strokeLinecap="round" />

                <ellipse cx="103" cy="37" rx="3.2" ry="4.3" fill="#17120F" />
                <ellipse cx="124" cy="37" rx="3.2" ry="4.3" fill="#17120F" />

                <path d="M111 44 L115 44 L113 47 Z" fill="#6B302B" />

                <path
                  d="M113 47 C110 50 107 50 104 48 M113 47 C116 50 119 50 122 48"
                  fill="none"
                  stroke="#251A14"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                <g fill="none" stroke="#2A211B" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
                  <path d="M106 45 L88 42" />
                  <path d="M106 48 L87 48" />
                  <path d="M106 51 L89 55" />
                  <path d="M120 45 L138 42" />
                  <path d="M120 48 L139 48" />
                  <path d="M120 51 L137 55" />
                </g>

                <path
                  d="M91 53 C94 60 101 65 108 66"
                  fill="none"
                  stroke="#E79A55"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              </g>
            </svg>
          </div>
        </div>

        <div className="route-loader-text">
          Загрузка<span className="route-loader-dots">{dots}</span>
        </div>
      </div>
    </div>
  );
}
