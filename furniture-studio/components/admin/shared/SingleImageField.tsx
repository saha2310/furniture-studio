'use client';

import { useEffect, useRef, useState } from 'react';
import { workImageUrl, siteAssetUrl, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { convertToWebp } from '@/lib/utils/image-client';
import { ImageCropDialog } from './ImageCropDialog';
import { MediaLibraryPicker } from './MediaLibraryPicker';
import type { MediaAsset } from '@/lib/actions/media';

export function SingleImageField({
  fieldName,
  existingPath,
  bucket = 'works',
  label = 'Изображение',
  help,
  cropRatio = 4 / 3,
  compact = false,
}: {
  fieldName: string;
  existingPath?: string | null;
  bucket?: 'works' | 'site';
  label?: string;
  help?: string;
  cropRatio?: number | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const existingUrl = existingPath ? (bucket === 'site' ? siteAssetUrl(existingPath) : workImageUrl(existingPath)) : null;
  const mediaUrl = mediaPath ? (bucket === 'site' ? siteAssetUrl(mediaPath) : workImageUrl(mediaPath)) : null;
  const currentUrl = previewUrl || mediaUrl || (!remove ? existingUrl : null);

  function pickFromLibrary(asset: { bucket: 'works' | 'site'; path: string }) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setFile(null);
    setInputFile(null);
    setPreviewUrl(null);
    setMediaPath(asset.path);
    setRemove(false);
    setLibraryOpen(false);
  }

  function setInputFile(nextFile: File | null) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    if (nextFile) dt.items.add(nextFile);
    inputRef.current.files = dt.files;
  }

  async function choose(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > MAX_IMAGE_SIZE_BYTES) return;
    setInputFile(null); // сразу очищаем реальный input, пока идёт конвертация — не отправить сырой файл при преждевременном сабмите
    setConverting(true);
    try {
      // Конвертация в WebP обязательна для любой загрузки, не только через
      // редактор кадрирования (тот тоже выдаёт WebP, но сам опционален) —
      // см. lib/utils/image-client.ts.
      const optimized = await convertToWebp(next);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(optimized);
      objectUrlRef.current = url;
      setFile(optimized);
      setInputFile(optimized);
      setPreviewUrl(url);
      setRemove(false);
      setMediaPath(null);
    } finally {
      setConverting(false);
    }
  }

  function openEditor() {
    const source = previewUrl || existingUrl;
    if (source) setEditorSource(source);
  }

  function applyCrop(nextFile: File, url: string) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    setFile(nextFile);
    setPreviewUrl(url);
    setInputFile(nextFile);
    setRemove(false);
    setEditorSource(null);
  }

  function clear() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setInputFile(null);
    setRemove(true);
    setMediaPath(null);
    setEditorSource(null);
  }

  return (
    <div className="border border-ink/10 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm text-ink/90">{label}</p>{help && <button type="button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp} className="admin-image-help-button mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/20 text-[10px] leading-none text-ink/60 transition-colors hover:border-ink/45 hover:text-ink sm:h-5 sm:w-5 sm:rounded-none" aria-label={`Что такое: ${label}`}>i</button>}</div>{help && showHelp && <p className="mt-2 max-w-[42ch] text-xs leading-5 text-ink/55 sm:max-w-[42ch]">{help}</p>}</div>
        {(currentUrl || existingUrl) && <button type="button" onClick={openEditor} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/70 hover:border-ink/40 hover:text-ink">Редактировать</button>}
      </div>

      <div className={`mt-4 overflow-hidden border border-ink/10 bg-black ${compact ? 'aspect-[4/3] max-w-sm' : 'aspect-[4/3]'}`}>
        {currentUrl ? <img src={currentUrl} alt="Предпросмотр" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/35">Изображение не выбрано</div>}
      </div>

      {converting && <p className="mt-3 text-[11px] leading-5 text-ink/70">Оптимизируем изображение…</p>}
      {!converting && file && <p className="mt-3 text-[11px] leading-5 text-ink/70">Новое изображение подготовлено. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <label className={`border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink ${converting ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
          {currentUrl ? 'Заменить' : 'Выбрать'}
          <input ref={inputRef} type="file" name={fieldName} disabled={converting} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files)} />
        </label>
        <button type="button" onClick={() => setLibraryOpen(true)} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink">
          Открыть галерею
        </button>
        {currentUrl && <button type="button" onClick={clear} className="border border-danger/20 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-danger hover:border-danger/50">Удалить</button>}
        {file && <button type="button" onClick={openEditor} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink">Обрезать</button>}
      </div>

      {mediaPath && <p className="mt-3 text-[11px] leading-5 text-ink/70">Выбрано из медиатеки. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}
      {remove && <input type="hidden" name={`${fieldName}_remove`} value="1" />}
      {mediaPath && <input type="hidden" name={`${fieldName}_media_path`} value={mediaPath} />}
      {editorSource && <ImageCropDialog sourceUrl={editorSource} initialRatio={cropRatio} onCancel={() => setEditorSource(null)} onApply={applyCrop} title={`Редактирование: ${label.toLowerCase()}`} />}
      {libraryOpen && (
        <MediaLibraryPicker
          bucket={bucket}
          onClose={() => setLibraryOpen(false)}
          onSelect={(asset) => pickFromLibrary(asset)}
        />
      )}
    </div>
  );
}
