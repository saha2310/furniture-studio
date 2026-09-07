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
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Фильтр по цвету">
      <Link
        href={allHref}
        className={`h-8 rounded-full border px-4 text-[11px] uppercase tracking-[0.1em] transition-colors ${
          !activeHex ? 'border-ink bg-ink/10 text-ink' : 'border-ink/20 text-stone hover:text-ink'
        }`}
      >
        Все цвета
      </Link>
      {colors.map((color) => {
        const params = new URLSearchParams(baseParams);
        params.set('color', color.hex);
        return (
          <Link
            key={color.hex}
            href={`/works?${params.toString()}`}
            title={color.name}
            aria-label={color.name}
            aria-pressed={activeHex === color.hex}
            className={`h-8 w-8 shrink-0 rounded-full border transition-transform ${
              activeHex === color.hex ? 'scale-110 border-ink' : 'border-ink/20 hover:scale-105'
            }`}
            style={{ backgroundColor: color.hex }}
          />
        );
      })}
    </div>
  );
}
