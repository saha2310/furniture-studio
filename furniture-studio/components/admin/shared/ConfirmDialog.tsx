'use client';

import { useState, useTransition } from 'react';

interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<{ success: boolean; message: string }>;
  triggerClassName?: string;
}

/**
 * Кнопка с подтверждением удаления: показывает диалог, вызывает серверное действие,
 * отражает loading/success/error прямо в диалоге (п.3 требований — «Удалить» должно
 * подтверждать, удалять, обновлять UI и показывать ошибку при неудаче).
 */
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel = 'Удалить',
  onConfirm,
  triggerClassName = 'text-sm text-red-700 hover:underline',
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded bg-canvas p-6">
            <h2 id="confirm-title" className="text-lg">{title}</h2>
            {description && <p className="mt-2 text-sm text-espresso">{description}</p>}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded px-4 py-2 text-sm text-espresso hover:bg-surface"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-60"
              >
                {isPending ? 'Удаляем…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
