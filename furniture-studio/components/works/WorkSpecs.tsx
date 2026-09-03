export function WorkSpecs({ specs }: { specs: Record<string, string> | null }) {
  if (!specs || Object.keys(specs).length === 0) return null;
  return (
    <dl className="border-t border-white/10">
      {Object.entries(specs).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[.75fr,1.25fr] gap-5 border-b border-white/10 py-4">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-stone">{key}</dt>
          <dd className="text-sm text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
