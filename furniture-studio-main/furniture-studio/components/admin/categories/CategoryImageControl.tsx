'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { setCategoryImage } from '@/lib/actions/categories';
import { ImageCropDialog } from '@/components/admin/shared/ImageCropDialog';
import { MediaLibraryPicker } from '@/components/admin/shared/MediaLibraryPicker';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { convertToWebp } from '@/lib/utils/image-client';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, workImageUrl } from '@/lib/utils/image';
import type { Track } from './autosave';

// Изображение категории верхнего уровня с действиями «заменить / кадрировать /
// удалить / медиатека». Каждое действие сразу сохраняется в БД — отдельной
// кнопки «Сохранить» нет.
//
// Файлы грузятся в Storage прямо из браузера (как в SingleImageField и
// WorkImageEditor), а на сервер уходят только пути — тело Server Action не
// упирается в лимит Vercel. Рядом с «рабочим» WebP кладём и несжатый
// оригинал, чтобы повторное кадрирование начиналось с исходника.
export function CategoryImageControl({
  categoryId,
  imagePath,
  originalPath,
  track,
}: {
  categoryId: string;
  imagePath: string | null;
  originalPath: string | null;
  track: Track;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Предпросмотр нового файла, пока он загружается и пока страница не
  // обновилась данными с сервера.
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  function dropPreview() {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = null;
    setPendingUrl(null);
  }

  function showPreview(url: string) {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    blobRef.current = url;
    setPendingUrl(url);
  }

  // Сервер прислал новый путь — предпросмотр больше не нужен.
  useEffect(() => { dropPreview(); }, [imagePath]);
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); }, []);

  const currentUrl = pendingUrl ?? (imagePath ? workImageUrl(imagePath) : null);

  async function upload(file: File, folder: 'categories' | 'originals'): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const path = folder === 'categories' ? `categories/${categoryId}-${suffix}.${ext}` : `originals/category-${categoryId}-${suffix}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('works').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  async function discardUploaded(paths: Array<string | null>) {
    const unique = Array.from(new Set(paths.filter((p): p is string => !!p)));
    if (unique.length) await supabase.storage.from('works').remove(unique).catch(() => null);
  }

  async function replaceFile(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { setError('Разрешены JPEG, PNG и WebP.'); return; }
    if (file.size > MAX_IMAGE_SIZE_BYTES) { setError(`Файл больше ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} МБ.`); return; }

    setError(null);
    setBusy(true);
    showPreview(URL.createObjectURL(file));
    let uploadedImage: string | null = null;
    let uploadedOriginal: string | null = null;
    try {
      const optimized = await convertToWebp(file);
      // Если файл уже был подходящим WebP, отдельная копия «оригинала» не нужна.
      const [image, original] = await Promise.all([
        upload(optimized, 'categories'),
        optimized === file ? Promise.resolve<string | null>(null) : upload(file, 'originals').catch(() => null),
      ]);
      uploadedImage = image;
      uploadedOriginal = original;
      const result = await track(() => setCategoryImage(categoryId, { imagePath: image, originalPath: original ?? image }));
      if (!result.success) { await discardUploaded([uploadedImage, uploadedOriginal]); dropPreview(); }
    } catch (e) {
      await discardUploaded([uploadedImage, uploadedOriginal]);
      dropPreview();
      setError(`Не удалось загрузить изображение: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function removeImage() {
    setError(null);
    setBusy(true);
    try {
      await track(() => setCategoryImage(categoryId, { imagePath: null, originalPath: null }));
    } finally {
      setBusy(false);
    }
  }

  async function pickFromLibrary(path: string) {
    setLibraryOpen(false);
    if (path === imagePath) return;
    setError(null);
    setBusy(true);
    try {
      // У файла из медиатеки нет отдельного оригинала — им служит он сам.
      await track(() => setCategoryImage(categoryId, { imagePath: path, originalPath: path, fromLibrary: true }));
    } finally {
      setBusy(false);
    }
  }

  function openCrop() {
    // Кадрируем от оригинала; если его нет (старые записи) — от того, что есть.
    const source = originalPath ?? imagePath;
    if (source) setEditorSource(workImageUrl(source));
  }

  async function applyCrop(file: File, url: string) {
    setEditorSource(null);
    setError(null);
    setBusy(true);
    showPreview(url);
    let uploadedImage: string | null = null;
    try {
      const image = await upload(file, 'categories');
      uploadedImage = image;
      // Оригинал остаётся прежним; если его не было — им становится
      // предыдущая версия, чтобы следующий кроп начинался не с обрезка.
      const result = await track(() => setCategoryImage(categoryId, { imagePath: image, originalPath: originalPath ?? imagePath }));
      if (!result.success) { await discardUploaded([uploadedImage]); dropPreview(); }
    } catch (e) {
      await discardUploaded([uploadedImage]);
      dropPreview();
      setError(`Не удалось сохранить кадрирование: ${e instanceof Error ? e.message : 'неизвестная ошибка'}`);
    } finally {
      setBusy(false);
    }
  }

  const linkClass = 'text-[13px] text-ink/55 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-40';

  return (
    <div>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-canvas">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Изображение категории" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.16em] text-ink/35">Изображение</div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/60 text-xs text-ink/70 backdrop-blur-[2px]" role="status">
            Сохраняем…
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <label className={`${linkClass} cursor-pointer focus-within:text-ink ${busy ? 'pointer-events-none opacity-40' : ''}`}>
          {currentUrl ? 'заменить' : 'загрузить'}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            disabled={busy}
            className="sr-only"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void replaceFile(file); }}
          />
        </label>
        {currentUrl && <button type="button" onClick={openCrop} disabled={busy || !imagePath} className={linkClass}>кадрировать</button>}
        {currentUrl && <button type="button" onClick={() => void removeImage()} disabled={busy} className={`${linkClass} hover:!text-danger`}>удалить</button>}
        <button type="button" onClick={() => setLibraryOpen(true)} disabled={busy} className={linkClass}>медиатека</button>
      </div>

      {error && <p role="alert" className="mt-2 text-center text-xs text-danger">{error}</p>}

      {editorSource && (
        <ImageCropDialog
          sourceUrl={editorSource}
          initialRatio={4 / 3}
          title="Редактирование: изображение категории"
          onCancel={() => setEditorSource(null)}
          onApply={(file, url) => void applyCrop(file, url)}
        />
      )}
      {libraryOpen && <MediaLibraryPicker bucket="works" onClose={() => setLibraryOpen(false)} onSelect={(asset) => void pickFromLibrary(asset.path)} />}
    </div>
  );
}
