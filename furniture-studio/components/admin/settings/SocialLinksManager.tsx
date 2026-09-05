'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createContactLink, updateContactLink, deleteContactLink } from '@/lib/actions/settings';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { SocialIcon } from '@/components/layout/SocialIcon';
import { KNOWN_CONTACT_PLATFORMS } from '@/types/domain';
import type { ContactLink } from '@/types/domain';

const PLATFORM_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  vk: 'VK',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  phone: 'Телефон',
  email: 'Email',
  custom: 'Другое',
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : label}
    </button>
  );
}

function NewLinkForm() {
  const [state, formAction] = useFormState(createContactLink, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border border-stone/70 p-5">
      <Select name="platform" label="Платформа" defaultValue="telegram">
        {KNOWN_CONTACT_PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {PLATFORM_LABELS[p]}
          </option>
        ))}
      </Select>
      <Input name="label" label="Название (видно на сайте)" placeholder="Telegram" required />
      <Input name="url" label="Ссылка" placeholder="https://t.me/username" required className="min-w-[240px]" />
      <label className="flex items-center gap-2 pb-2.5 text-sm">
        <input type="checkbox" name="is_visible" defaultChecked className="h-4 w-4" />
        Показывать
      </label>
      <SubmitButton label="Добавить" />
      {state && !state.success && <FormStatus state={{ status: 'error', message: state.message }} />}
    </form>
  );
}

function LinkRow({ link }: { link: ContactLink }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateContactLink.bind(null, link.id), null);

  if (editing) {
    return (
      <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-stone/40 p-4">
        <Select name="platform" label="Платформа" defaultValue={link.platform}>
          {KNOWN_CONTACT_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </Select>
        <Input name="label" label="Название" defaultValue={link.label} required />
        <Input name="url" label="Ссылка" defaultValue={link.url} required className="min-w-[240px]" />
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" name="is_visible" defaultChecked={link.is_visible} className="h-4 w-4" />
          Показывать
        </label>
        <SubmitButton label="Сохранить" />
        <button type="button" onClick={() => setEditing(false)} className="pb-2.5 text-sm text-espresso hover:underline">
          Отмена
        </button>
        {state && !state.success && <FormStatus state={{ status: 'error', message: state.message }} />}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-stone/40 p-4 last:border-0">
      <div className="flex items-center gap-3">
        <SocialIcon platform={link.platform} className="h-4 w-4 text-espresso" />
        <div>
          <p>{link.label} {!link.is_visible && <span className="text-xs text-stone">(скрыто)</span>}</p>
          <p className="text-sm text-stone">{link.url}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setEditing(true)} className="text-sm hover:text-walnut">
          Изменить
        </button>
        <ConfirmDialog
          triggerLabel="Удалить"
          title={`Удалить «${link.label}»?`}
          onConfirm={() => deleteContactLink(link.id)}
        />
      </div>
    </div>
  );
}

export function SocialLinksManager({ links }: { links: ContactLink[] }) {
  return (
    <div>
      <NewLinkForm />
      <div className="mt-6 rounded border border-stone/70">
        {links.length === 0 ? (
          <p className="p-6 text-center text-sm text-espresso">Способы связи ещё не добавлены.</p>
        ) : (
          links.map((link) => <LinkRow key={link.id} link={link} />)
        )}
      </div>
    </div>
  );
}
