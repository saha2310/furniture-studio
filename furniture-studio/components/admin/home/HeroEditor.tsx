'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateHeroSection } from '@/lib/actions/home-sections';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormStatus } from '@/components/ui/FormStatus';
import { workImageUrl } from '@/lib/utils/image';
import type { HeroContent } from '@/types/domain';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : 'Сохранить Hero'}
    </button>
  );
}

export function HeroEditor({ content, isVisible }: { content: HeroContent | null; isVisible: boolean }) {
  const [state, formAction] = useFormState(updateHeroSection, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded border border-stone/70 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Hero (первый экран)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_visible" defaultChecked={isVisible} className="h-4 w-4" />
          Показывать секцию
        </label>
      </div>

      <Input name="title" label="Заголовок" defaultValue={content?.title ?? ''} required />
      <Textarea name="description" label="Описание" rows={3} defaultValue={content?.description ?? ''} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="primaryCtaLabel" label="Текст основной кнопки" defaultValue={content?.primaryCtaLabel ?? 'Обсудить проект'} required />
        <Input name="primaryCtaHref" label="Ссылка основной кнопки" defaultValue={content?.primaryCtaHref ?? '/contacts'} required />
        <Input name="secondaryCtaLabel" label="Текст второй кнопки" defaultValue={content?.secondaryCtaLabel ?? 'Посмотреть работы'} required />
        <Input name="secondaryCtaHref" label="Ссылка второй кнопки" defaultValue={content?.secondaryCtaHref ?? '/works'} required />
      </div>

      <div>
        <label htmlFor="image" className="text-sm text-espresso">
          Фото (заменяет текущее, если выбрано)
        </label>
        {content?.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={workImageUrl(content.imagePath)} alt="" className="mt-2 h-32 w-auto rounded object-cover" />
        )}
        <input type="file" id="image" name="image" accept="image/jpeg,image/png,image/webp" className="mt-2 block text-sm" />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
