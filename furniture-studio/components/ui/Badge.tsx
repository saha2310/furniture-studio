export function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'muted' | 'warning' }) {
  const tones = {
    default: 'bg-ink text-canvas',
    muted: 'bg-surface text-espresso',
    warning: 'bg-amber-100 text-amber-800',
  } as const;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}
