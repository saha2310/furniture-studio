'use client';

import { useEffect, useId, useState, useTransition } from 'react';

interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<{ success: boolean; message: string }>;
  triggerClassName?: string;
}

export function ConfirmDialog({ triggerLabel, title, description, confirmLabel = 'Удалить', onConfirm, triggerClassName = 'text-xs uppercase tracking-[0.12em] text-white/50 hover:text-white' }: ConfirmDialogProps) {
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
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md border border-white/10 bg-[#171716] p-6 shadow-2xl sm:p-7">
        <h2 id={titleId} className="text-lg text-white">{title}</h2>
        {description && <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>}
        {error && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs leading-5 text-red-200">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="min-h-11 border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-white/55 hover:text-white disabled:opacity-40">Отмена</button>
          <button type="button" onClick={handleConfirm} disabled={isPending} className="min-h-11 border border-red-300/20 bg-red-300/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-red-100 hover:bg-red-300/15 disabled:opacity-40">{isPending ? 'Удаление…' : confirmLabel}</button>
        </div>
      </div>
    </div>}
  </>;
}
