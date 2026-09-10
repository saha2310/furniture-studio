export type NavigationIconName = 'home' | 'works' | 'favorites' | 'contact';

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  viewBox: '0 0 24 24',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function NavigationIcon({ name, active = false, className = 'h-5 w-5' }: { name: NavigationIconName; active?: boolean; className?: string }) {
  if (name === 'home') {
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="m3.5 10.8 8.5-6.6 8.5 6.6" />
        <path d="M5.5 10.1V20h13v-9.9" />
        <path d="M9.5 20v-5.4h5V20" />
      </svg>
    );
  }

  if (name === 'works') {
    return (
      <svg {...common} className={className} aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="0.9" />
        <rect x="14" y="4" width="6" height="6" rx="0.9" />
        <rect x="4" y="14" width="6" height="6" rx="0.9" />
        <rect x="14" y="14" width="6" height="6" rx="0.9" />
      </svg>
    );
  }

  if (name === 'favorites') {
    return (
      <svg {...common} className={className} aria-hidden="true" fill={active ? 'currentColor' : 'none'}>
        <path d="M12 20.3 4.9 13.5a4.8 4.8 0 0 1 6.8-6.8L12 7l.3-.3a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
      </svg>
    );
  }

  return (
    <svg {...common} className={className} aria-hidden="true">
      <path d="M4 5.5h16v10.8H9l-5 3.2V5.5Z" />
      <path d="M8 9.5h8M8 13h5" />
    </svg>
  );
}
