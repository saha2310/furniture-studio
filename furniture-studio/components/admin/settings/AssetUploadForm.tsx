'use client';

import { useTransition, useState } from 'react';
import { uploadSiteAsset } from '@/lib/actions/settings';
import { siteAssetUrl } from '@/lib/utils/image';

export function AssetUploadForm({
  field,
  label,
  currentPath,
}: {
  field: 'logo_path' | 'favicon_path' | 'og_image_path';
  label: string;
  currentPath: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await uploadSiteAsset(field, formData);
      setMessage({ success: result.success, text: result.message });
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 rounded border border-stone/70 p-4">
      <p className="text-sm text-espresso">{label}</p>
      {currentPath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={siteAssetUrl(currentPath)} alt="" className="h-12 w-auto object-contain" />
      )}
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas disabled:opacity-60"
      >
        {isPending ? 'Загружаем…' : 'Загрузить'}
      </button>
      {message && (
        <p role={message.success ? 'status' : 'alert'} className={`text-xs ${message.success ? 'text-espresso' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
