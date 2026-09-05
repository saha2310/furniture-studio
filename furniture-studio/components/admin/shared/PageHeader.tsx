export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">Админ-панель</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2rem)] tracking-[-0.025em] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/50">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
