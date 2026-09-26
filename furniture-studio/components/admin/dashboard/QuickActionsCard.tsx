import Link from 'next/link';

// Раньше это были просто две ссылки-кнопки под карточками. Теперь —
// отдельный именованный блок, чтобы страница не заканчивалась "повисшими"
// кнопками без контекста, и чтобы сюда же можно было добавить ещё действия
// (напр. "Управление категориями") без переверстки.
const ACTIONS = [
  { href: '/admin/works/new', label: 'Добавить работу', tone: 'primary' as const },
  { href: '/admin/categories', label: 'Управление категориями', tone: 'secondary' as const },
  { href: '/', label: 'Открыть сайт', tone: 'secondary' as const, external: true },
];

export function QuickActionsCard() {
  return (
    <div className="border border-ink/10 bg-surface p-5">
      <h2 className="mb-4 text-sm font-medium text-ink">Быстрые действия</h2>
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            target={action.external ? '_blank' : undefined}
            className={
              action.tone === 'primary'
                ? 'rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso'
                : 'rounded border border-stone px-5 py-2.5 text-[15px] text-ink hover:border-ink'
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
