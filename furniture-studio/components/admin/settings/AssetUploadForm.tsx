'use client';

import { useFormState } from 'react-dom';
import { saveSiteAsset } from '@/lib/actions/settings';
import { SingleImageField } from '@/components/admin/shared/SingleImageField';
import { FormStatus } from '@/components/ui/FormStatus';

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
        <button type="submit" className="bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas">Сохранить изображение</button>
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
