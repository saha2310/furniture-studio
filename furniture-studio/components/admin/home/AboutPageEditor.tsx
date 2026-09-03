'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateAboutPage } from '@/lib/actions/home-sections';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormStatus } from '@/components/ui/FormStatus';

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

export function AboutPageEditor({
  title,
  subtitle,
  body,
}: {
  title: string | null;
  subtitle: string | null;
  body: string;
}) {
  const [state, formAction] = useFormState(updateAboutPage, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded border border-stone/70 p-6">
      <Input name="title" label="Заголовок страницы" defaultValue={title ?? ''} />
      <Textarea name="subtitle" label="Подзаголовок" rows={2} defaultValue={subtitle ?? ''} />
      <Textarea name="body" label="Основной текст" rows={10} defaultValue={body} />
      <div className="flex items-center gap-4">
        <SubmitButton />
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
