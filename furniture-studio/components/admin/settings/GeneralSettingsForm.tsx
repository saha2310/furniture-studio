'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateSiteSettings } from '@/lib/actions/settings';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormStatus } from '@/components/ui/FormStatus';
import type { SiteSettings } from '@/types/domain';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : 'Сохранить'}
    </button>
  );
}

export function GeneralSettingsForm({ settings }: { settings: SiteSettings | null }) {
  const [state, formAction] = useFormState(updateSiteSettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded border border-stone/70 p-6">
      <h2 className="text-lg">Основные</h2>
      <Input name="company_name" label="Название компании" defaultValue={settings?.company_name ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="phone" label="Телефон" defaultValue={settings?.phone ?? ''} />
        <Input name="email" type="email" label="Email" defaultValue={settings?.email ?? ''} />
      </div>
      <Input name="address" label="Адрес" defaultValue={settings?.address ?? ''} />

      <h2 className="mt-2 text-lg">SEO по умолчанию</h2>
      <Input name="seo_default_title" label="Title по умолчанию" defaultValue={settings?.seo_default_title ?? ''} />
      <Textarea
        name="seo_default_description"
        label="Description по умолчанию"
        rows={3}
        defaultValue={settings?.seo_default_description ?? ''}
      />

      <div className="flex items-center gap-4">
        <SubmitButton />
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
