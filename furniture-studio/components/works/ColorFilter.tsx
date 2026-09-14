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

  return (
    <nav aria-label="Фильтр по цвету" className="flex flex-wrap items-center">
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
  );
}
