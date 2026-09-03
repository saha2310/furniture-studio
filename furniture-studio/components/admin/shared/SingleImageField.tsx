'use client';

import { useEffect, useRef, useState } from 'react';
import { workImageUrl } from '@/lib/utils/image';
import { siteAssetUrl } from '@/lib/utils/image';
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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type) || next.size > 8 * 1024 * 1024) return;
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
    <div className="border border-white/10 bg-[#171716] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm text-white/90">{label}</p>{help && <button type="button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp} className="flex h-5 w-5 items-center justify-center border border-white/20 text-[10px] text-white/60 hover:border-white/45 hover:text-white" aria-label={`Что такое: ${label}`}>i</button>}</div>{help && showHelp && <p className="mt-2 max-w-[42ch] text-xs leading-5 text-white/55">{help}</p>}</div>
        {(currentUrl || existingUrl) && <button type="button" onClick={openEditor} className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/70 hover:border-white/40 hover:text-white">Редактировать</button>}
      </div>

      <div className={`mt-4 overflow-hidden border border-white/10 bg-black ${compact ? 'aspect-[4/3] max-w-sm' : 'aspect-[4/3]'}`}>
        {currentUrl ? <img src={currentUrl} alt="Предпросмотр" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/35">Изображение не выбрано</div>}
      </div>

      {file && <p className="mt-3 text-[11px] leading-5 text-white/70">Новое изображение подготовлено. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="cursor-pointer border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/75 hover:border-white/40 hover:text-white">
          {currentUrl ? 'Заменить' : 'Выбрать'}
          <input ref={inputRef} type="file" name={fieldName} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files)} />
        </label>
        {currentUrl && <button type="button" onClick={clear} className="border border-red-400/20 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-red-200 hover:border-red-300/50">Удалить</button>}
        {file && <button type="button" onClick={openEditor} className="border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/75 hover:border-white/40 hover:text-white">Обрезать</button>}
      </div>

      {remove && <input type="hidden" name={`${fieldName}_remove`} value="1" />}
      {editorSource && <ImageCropDialog sourceUrl={editorSource} initialRatio={cropRatio} onCancel={() => setEditorSource(null)} onApply={applyCrop} title={`Редактирование: ${label.toLowerCase()}`} />}
    </div>
  );
}
