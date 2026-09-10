'use client';

import { useState } from 'react';

export function AdminSection({
  title,
  description,
  children,
  defaultOpen = false,
  status,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  status?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border border-ink/10 bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ink/[0.02] sm:px-6"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">{title}</span>
          {description && <span className="mt-1 block text-xs leading-5 text-ink/50">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {status}
          <span className="text-ink/45" aria-hidden="true">{open ? '−' : '+'}</span>
        </span>
      </button>
      {open && <div className="border-t border-ink/10 p-5 sm:p-6">{children}</div>}
    </section>
  );
}
