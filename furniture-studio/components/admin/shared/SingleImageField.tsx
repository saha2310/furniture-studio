'use client';

import { useEffect, useRef, useState } from 'react';
import { workImageUrl, siteAssetUrl, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { ImageCropDialog } from './ImageCropDialog';

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
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const existingUrl = existingPath ? (bucket === 'site' ? siteAssetUrl(existingPath) : workImageUrl(existingPath)) : null;
  const currentUrl = previewUrl || (!remove ? existingUrl : null);

  function setInputFile(nextFile: File | null) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    if (nextFile) dt.items.add(nextFile);
    inputRef.current.files = dt.files;
  }

  function choose(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > MAX_IMAGE_SIZE_BYTES) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(next);
    objectUrlRef.current = url;
    setFile(next);
    setInputFile(next);
    setPreviewUrl(url);
    setRemove(false);
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
    setEditorSource(null);
  }

  return (
    <div className="border border-ink/10 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm text-ink/90">{label}</p>{help && <button type="button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp} className="admin-image-help-button mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/20 text-[10px] leading-none text-ink/60 transition-colors hover:border-ink/45 hover:text-ink sm:h-5 sm:w-5 sm:rounded-none" aria-label={`Что такое: ${label}`}>i</button>}</div>{help && showHelp && <p className="mt-2 max-w-[42ch] text-xs leading-5 text-ink/55 sm:max-w-[42ch]">{help}</p>}</div>
        {(currentUrl || existingUrl) && <button type="button" onClick={openEditor} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/70 hover:border-ink/40 hover:text-ink">Редактировать</button>}
      </div>

      <div className={`mt-4 overflow-hidden border border-ink/10 bg-black ${compact ? 'aspect-[4/3] max-w-sm' : 'aspect-[4/3]'}`}>
        {currentUrl ? <img src={currentUrl} alt="Предпросмотр" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-ink/35">Изображение не выбрано</div>}
      </div>

      {file && <p className="mt-3 text-[11px] leading-5 text-ink/70">Новое изображение подготовлено. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink">
          {currentUrl ? 'Заменить' : 'Выбрать'}
          <input ref={inputRef} type="file" name={fieldName} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files)} />
        </label>
        {currentUrl && <button type="button" onClick={clear} className="border border-red-400/20 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-red-200 hover:border-red-300/50">Удалить</button>}
        {file && <button type="button" onClick={openEditor} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink">Обрезать</button>}
      </div>

      {remove && <input type="hidden" name={`${fieldName}_remove`} value="1" />}
      {editorSource && <ImageCropDialog sourceUrl={editorSource} initialRatio={cropRatio} onCancel={() => setEditorSource(null)} onApply={applyCrop} title={`Редактирование: ${label.toLowerCase()}`} />}
    </div>
  );
}
