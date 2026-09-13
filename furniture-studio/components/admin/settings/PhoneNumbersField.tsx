'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { createContactLink, deleteContactLink } from '@/lib/actions/settings';
import { formatPhoneForHref } from '@/lib/utils/format';
import type { ContactLink } from '@/types/domain';

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex h-9 items-center border border-ink/20 bg-ink px-3 text-xs text-canvas hover:bg-ink/90 disabled:opacity-50">
      {pending ? '…' : 'Добавить'}
    </button>
  );
}

export function PhoneNumbersField({ phones }: { phones: ContactLink[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction] = useFormState(createContactLink, null);

  useEffect(() => {
    if (state?.success && adding) {
      setAdding(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function removePhone(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deleteContactLink(id);
      router.refresh();
      setDeletingId(null);
    });
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-espresso">Ещё номера</p>
      <div className="mt-2 flex flex-col gap-2">
        {phones.map((phone) => (
          <div key={phone.id} className="flex items-center justify-between gap-3 border border-ink/10 px-3 py-2">
            <a href={formatPhoneForHref(phone.url.replace(/^tel:/i, ''))} className="text-sm text-ink hover:underline">
              {phone.label}
            </a>
            <button
              type="button"
              onClick={() => removePhone(phone.id)}
              disabled={isPending && deletingId === phone.id}
              aria-label={`Удалить ${phone.label}`}
              className="text-ink/40 hover:text-red-300 disabled:opacity-40"
            >
              {isPending && deletingId === phone.id ? '…' : '×'}
            </button>
          </div>
        ))}

        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); requestAnimationFrame(() => inputRef.current?.focus()); }}
            className="flex h-10 items-center justify-center gap-1.5 border border-dashed border-ink/20 text-xs text-ink/55 hover:border-ink/40 hover:text-ink"
          >
            <span className="text-base leading-none">+</span> Добавить номер
          </button>
        )}

        {adding && (
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="platform" value="phone" />
            <input type="hidden" name="label" value={`Телефон ${phones.length + 1}`} />
            <input
              ref={inputRef}
              name="url"
              type="tel"
              placeholder="+7 900 000-00-00"
              required
              className="h-9 flex-1 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
            />
            <AddButton />
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-ink/40 hover:text-ink">Отмена</button>
          </form>
        )}
        {state && !state.success && <p className="text-xs text-red-300">{state.message}</p>}
      </div>
    </div>
  );
}
