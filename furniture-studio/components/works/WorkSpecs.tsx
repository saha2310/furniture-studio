export function WorkSpecs({ specs }: { specs: Record<string, string> | null }) {
  if (!specs || Object.keys(specs).length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-3 border-t border-stone/70 pt-6">
      {Object.entries(specs).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-sm text-stone">{key}</dt>
          <dd className="text-[15px] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
