'use client';

export function SaveBar({
  label = 'Сохранить',
  pending = false,
  disabled = false,
  message,
}: {
  label?: string;
  pending?: boolean;
  disabled?: boolean;
  message?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-30 mt-2 border border-ink/10 bg-canvas/95 p-3 shadow-2xl backdrop-blur sm:p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs leading-5 text-ink/55">{message ?? 'Все изменения применяются одной кнопкой.'}</div>
        <button
          type="submit"
          disabled={pending || disabled}
          className="inline-flex min-h-11 shrink-0 items-center justify-center border border-ink/20 bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-canvas transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Сохранение…' : label}
        </button>
      </div>
    </div>
  );
}
