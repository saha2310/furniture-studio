'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateContactsGallery } from '@/lib/actions/home-sections';
import { ImageSetField } from '@/components/admin/shared/ImageSetField';
import { FormStatus } from '@/components/ui/FormStatus';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60">
      {pending ? 'Сохраняем…' : 'Сохранить карусель'}
    </button>
  );
}

export function ContactsGalleryEditor({ images }: { images: { bucket: 'works' | 'site'; path: string }[] }) {
  const [state, formAction] = useFormState(updateContactsGallery, null);

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded border border-stone/70 p-6">
      <div>
        <h2 className="text-lg">Карусель на странице «Контакты»</h2>
        <p className="mt-1 text-xs leading-5 text-stone">
          До 5 фото. На сайте сменяются автоматически каждые 5 секунд. Порядок — как здесь (стрелками можно менять
          местами).
        </p>
      </div>

      <ImageSetField
        name="gallery"
        existing={images}
        max={5}
        label="Фотографии карусели"
      />

      <div className="flex items-center gap-4">
        <SubmitButton />
        <FormStatus state={state} />
      </div>
    </form>
  );
}
