'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveSiteAsset } from '@/lib/actions/settings';
import { SingleImageField } from '@/components/admin/shared/SingleImageField';
import { FormStatus } from '@/components/ui/FormStatus';

function SaveImageButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="group relative overflow-hidden bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas transition-all duration-200 hover:bg-espresso active:scale-[0.98] disabled:cursor-wait disabled:opacity-80">
      <span className="inline-flex items-center gap-2">
        {pending && <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border border-canvas/30 border-t-canvas" />}
        <span>{pending ? 'Сохраняем…' : 'Сохранить изображение'}</span>
      </span>
      {pending && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px animate-pulse bg-canvas/80" />}
    </button>
  );
}

export function AssetUploadForm({ field, label, currentPath, help }: {
  field: 'logo_path' | 'favicon_path' | 'og_image_path';
  label: string;
  currentPath: string | null;
  help: string;
}) {
  const [state, formAction] = useFormState(saveSiteAsset.bind(null, field), null);
  return (
    <form action={formAction} className="flex flex-col gap-4 border border-ink/10 bg-surface p-4">
      <SingleImageField fieldName="file" existingPath={currentPath} bucket="site" label={label} help={help} cropRatio={field === 'favicon_path' ? 1 : 1.91} compact />
      <div className="flex items-center gap-3 border-t border-ink/10 pt-4">
        <SaveImageButton />
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
