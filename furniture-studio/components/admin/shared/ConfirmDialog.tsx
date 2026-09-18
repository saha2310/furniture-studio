'use client';

import { useEffect, useId, useState, useTransition } from 'react';

interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<{ success: boolean; message: string }>;
  triggerClassName?: string;
  // 'danger' (по умолчанию) — красная кнопка подтверждения, как и было,
  // для необратимых действий (удаление). 'neutral' — нейтральная кнопка в
  // цвет интерфейса, для обратимых действий (например, смена статуса).
  tone?: 'danger' | 'neutral';
}

export function ConfirmDialog({ triggerLabel, title, description, confirmLabel = 'Удалить', onConfirm, triggerClassName = 'text-xs uppercase tracking-[0.12em] text-ink/50 hover:text-ink', tone = 'danger' }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [open, isPending]);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.success) setOpen(false);
      else setError(result.message);
    });
  }

  return <>
    <button type="button" onClick={() => { setError(null); setOpen(true); }} className={triggerClassName}>{triggerLabel}</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setOpen(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md border border-ink/10 bg-surface p-6 shadow-2xl sm:p-7">
        <h2 id={titleId} className="text-lg text-ink">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-ink/55">{description}</p>}
        {error && <p role="alert" className="mt-4 border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="min-h-11 border border-ink/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-ink/55 hover:text-ink disabled:opacity-40">Отмена</button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={
              tone === 'danger'
                ? 'min-h-11 border border-danger/20 bg-danger/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-danger hover:bg-danger/15 disabled:opacity-40'
                : 'min-h-11 border border-ink/15 bg-ink px-4 py-3 text-xs uppercase tracking-[0.12em] text-canvas hover:bg-espresso disabled:opacity-40'
            }
          >
            {isPending ? (tone === 'danger' ? 'Удаление…' : 'Сохраняем…') : confirmLabel}
          </button>
        </div>
      </div>
    </div>}
  </>;
}
