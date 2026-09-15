import Link from 'next/link';

export function ColorFilter({
  colors,
  activeHex,
  categorySlug,
}: {
  colors: Array<{ name: string; hex: string }>;
  activeHex?: string;
  categorySlug?: string;
}) {
  if (colors.length < 2) return null;

  const baseParams = new URLSearchParams();
  if (categorySlug) baseParams.set('category', categorySlug);
  const allHref = baseParams.toString() ? `/works?${baseParams.toString()}` : '/works';

  const activeColor = colors.find((color) => color.hex === activeHex);

  // Сворачиваемый список цветов реализован через нативные <details>/<summary> —
  // без JS и без 'use client': фильтрация по-прежнему обычные <Link> с
  // query-параметром ?color=, работает даже с отключённым JavaScript.
  // Если в URL уже есть активный цвет — панель раскрыта сразу (open),
  // а имя цвета показано прямо на кнопке, чтобы фильтр не терялся из виду.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <details className="group" open={Boolean(activeColor)}>
        <summary className="liquid-glass-filter-button inline-flex h-12 cursor-pointer list-none items-center gap-2 border px-7 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors marker:hidden [&::-webkit-details-marker]:hidden">
          <span>Фильтры{activeColor ? ` · ${activeColor.name}` : ''}</span>
          <span aria-hidden="true" className="text-sm leading-none transition-transform duration-300 group-open:rotate-45">+</span>
        </summary>

        <nav aria-label="Фильтр по цвету" className="mt-3 flex flex-wrap items-center gap-y-2 border border-ink/10 bg-surface p-4">
          <Link
            href={allHref}
            className={`shrink-0 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              !activeHex ? 'border border-ink/25 bg-ink/[0.05] text-ink' : 'border border-transparent text-stone hover:text-ink'
            }`}
          >
            Все цвета
          </Link>

          {colors.map((color) => {
            const params = new URLSearchParams(baseParams);
            params.set('color', color.hex);
            const isActive = activeHex === color.hex;

            return (
              <span key={color.hex} className="flex items-center">
                <span className="mx-3 h-3 w-px shrink-0 bg-ink/10" aria-hidden="true" />
                <Link
                  href={`/works?${params.toString()}`}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 py-1.5 text-[12px] tracking-[0.01em] transition-colors ${
                    isActive ? 'text-ink' : 'text-stone hover:text-ink'
                  }`}
                >
                  <span className="fabric-swatch" style={{ '--swatch-color': color.hex } as React.CSSProperties} />
                  {color.name}
                </Link>
              </span>
            );
          })}
        </nav>
      </details>

      {activeColor && (
        <Link
          href={allHref}
          aria-label={`Сбросить фильтр по цвету «${activeColor.name}»`}
          title="Сбросить фильтр по цвету"
          className="liquid-glass-filter-button inline-flex h-12 w-12 items-center justify-center rounded-full border text-sm"
        >
          ×
        </Link>
      )}
    </div>
  );
}
