'use client';

import { useTransition, useState } from 'react';
import { uploadSiteAsset, deleteSiteAsset } from '@/lib/actions/settings';
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
      <div className="flex items-start justify-between gap-3"><p className="text-sm text-espresso">{label}</p><span title={field === 'logo_path' ? 'Логотип — знак или название бренда в шапке сайта.' : field === 'favicon_path' ? 'Favicon — маленькая иконка вкладки браузера.' : 'OG-картинка — изображение для превью ссылки в соцсетях и мессенджерах.'} className="cursor-help border border-stone/50 px-1.5 text-xs text-stone">?</span></div>
      {currentPath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={siteAssetUrl(currentPath)} alt="" className="h-12 w-auto object-contain" />
      )}
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded border border-ink px-4 py-2 text-sm hover:bg-ink hover:text-canvas disabled:opacity-60"
        >
          {isPending ? 'Загружаем…' : 'Загрузить / заменить'}
        </button>
        {currentPath && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = await deleteSiteAsset(field);
                setMessage({ success: result.success, text: result.message });
              });
            }}
            className="border border-red-900/40 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
          >
            Удалить
          </button>
        )}
      </div>
      {message && (
        <p role={message.success ? 'status' : 'alert'} className={`text-xs ${message.success ? 'text-espresso' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
