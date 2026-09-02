'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  uploadWorkImages,
  deleteWorkImage,
  setCoverImage,
  reorderWorkImages,
} from '@/lib/actions/works';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import type { WorkImageWithUrl } from '@/types/domain';

interface ImageManagerProps {
  workId: string;
  images: WorkImageWithUrl[];
  coverImageId: string | null;
}

export function ImageManager({ workId, images, coverImageId }: ImageManagerProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [isReordering, startReorder] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(formData: FormData) {
    setUploadError(null);
    setUploadMessage(null);
    startUpload(async () => {
      const result = await uploadWorkImages(workId, formData);
      if (result.success) {
        setUploadMessage(result.message);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setUploadError(result.message);
      }
    });
  }

  const [isSettingCover, startSetCover] = useTransition();
  const [coverError, setCoverError] = useState<string | null>(null);

  function handleSetCover(imageId: string) {
    setCoverError(null);
    startSetCover(async () => {
      const result = await setCoverImage(workId, imageId);
      if (!result.success) setCoverError(result.message);
    });
  }

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startReorder(() => reorderWorkImages(workId, reordered.map((img) => img.id)));
  }

  return (
    <div>
      <form
        action={(formData) => handleUpload(formData)}
        className="flex flex-col gap-3 rounded border border-dashed border-stone p-5"
      >
        <label htmlFor="files" className="text-sm text-espresso">
          Добавить фотографии (JPEG, PNG, WebP — до 8 МБ каждая)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          id="files"
          name="files"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
        />
        <button
          type="submit"
          disabled={isUploading}
          className="self-start rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
        >
          {isUploading ? 'Загружаем…' : 'Загрузить'}
        </button>
        {uploadError && (
          <p role="alert" className="text-sm text-red-700">
            {uploadError}
          </p>
        )}
        {uploadMessage && (
          <p role="status" className="text-sm text-espresso">
            {uploadMessage}
          </p>
        )}
      </form>

      {images.length === 0 ? (
        <p className="mt-6 text-sm text-stone">Фотографий пока нет.</p>
      ) : (
        <>
          {coverError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {coverError}
            </p>
          )}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, i) => (
            <div key={image.id} className="group relative overflow-hidden rounded border border-stone/70">
              <div className="relative aspect-square">
                <Image src={image.url} alt={image.alt_text || ''} fill sizes="200px" className="object-cover" />
              </div>
              {image.id === coverImageId && (
                <span className="absolute left-2 top-2 rounded bg-ink px-2 py-0.5 text-xs text-canvas">
                  Обложка
                </span>
              )}
              <div className="flex items-center justify-between gap-1 bg-canvas p-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || isReordering}
                    aria-label="Переместить раньше"
                    className="px-1.5 text-sm text-espresso hover:text-ink disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1 || isReordering}
                    aria-label="Переместить позже"
                    className="px-1.5 text-sm text-espresso hover:text-ink disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {image.id !== coverImageId && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(image.id)}
                      disabled={isSettingCover}
                      className="text-xs text-walnut hover:text-walnutDark disabled:opacity-50"
                    >
                      Сделать обложкой
                    </button>
                  )}
                  <ConfirmDialog
                    triggerLabel="Удалить"
                    title="Удалить фотографию?"
                    confirmLabel="Удалить"
                    onConfirm={() => deleteWorkImage(image.id, workId)}
                    triggerClassName="text-xs text-red-700 hover:underline"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
