'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { workImageUrl, siteAssetUrl, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { convertToWebp } from '@/lib/utils/image-client';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { ImageCropDialog } from './ImageCropDialog';
import { MediaLibraryPicker } from './MediaLibraryPicker';

export function SingleImageField({
  fieldName,
  existingPath,
  existingOriginalPath,
  bucket = 'works',
  label = 'Изображение',
  help,
  cropRatio = 4 / 3,
  compact = false,
  onBusyChange,
}: {
  fieldName: string;
  existingPath?: string | null;
  // Несжатый оригинал, уже сохранённый в БД для этого изображения (см.
  // 0010_image_originals.sql и content_json.imageOriginalPath у Hero).
  // Может отсутствовать даже если existingPath задан — например, у записей,
  // сохранённых до появления этого поля: для них честно нечего кадрировать,
  // кроме последнего сохранённого результата.
  existingOriginalPath?: string | null;
  bucket?: 'works' | 'site';
  label?: string;
  help?: string;
  cropRatio?: number | null;
  compact?: boolean;
  // Пока «сырой» оригинал ещё грузится в Storage напрямую из браузера (см.
  // ниже), родительская форма должна блокировать сохранение — иначе можно
  // сохранить форму раньше, чем путь к оригиналу будет готов, и скрытое поле
  // уйдёт пустым (тот же класс проблемы, что и у WorkImageEditor.onBusyChange).
  onBusyChange?: (busy: boolean) => void;
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
  // Токен последнего вызова choose() — если пользователь успевает выбрать
  // файл ещё раз до того, как конвертация/загрузка оригинала предыдущего
  // выбора завершилась, результаты устаревшего вызова не должны перезаписать
  // состояние поверх уже более нового выбора.
  const chooseTokenRef = useRef(0);

  // Путь к НЕСЖАТОМУ оригиналу, загруженному в этой сессии напрямую в
  // Storage (в обход тела Server Action — см. комментарий у
  // uploadOriginalDirect). Отдельно от `file`/`previewUrl`, которые всегда
  // относятся к «рабочей» (webp, возможно обрезанной) версии.
  const [sessionOriginalPath, setSessionOriginalPath] = useState<string | null>(null);
  const [originalUploading, setOriginalUploading] = useState(false);
  const [originalUploadError, setOriginalUploadError] = useState<string | null>(null);

  const supabaseBrowser = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => { onBusyChange?.(originalUploading); }, [originalUploading, onBusyChange]);
  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const existingUrl = existingPath ? (bucket === 'site' ? siteAssetUrl(existingPath) : workImageUrl(existingPath)) : null;
  const mediaUrl = mediaPath ? (bucket === 'site' ? siteAssetUrl(mediaPath) : workImageUrl(mediaPath)) : null;
  const currentUrl = previewUrl || mediaUrl || (!remove ? existingUrl : null);

  function assetUrl(path: string) { return bucket === 'site' ? siteAssetUrl(path) : workImageUrl(path); }

  // Грузит СЫРОЙ (неконвертированный, некадрированный) файл напрямую в
  // Storage из браузера — как WorkImageEditor.uploadOriginal. Так же, как и
  // там, это сознательно НЕ идёт через тело Server Action: если бы оригинал
  // ехал в том же multipart-запросе, что и «рабочая» картинка, суммарный
  // размер двух файлов на боевом деплое мог бы упереться в жёсткий лимит
  // тела serverless-функции Vercel (см. MAX_IMAGE_SIZE_BYTES в
  // lib/utils/image.ts и раздел «Известные ограничения» в README) — то же
  // самое соображение, из-за которого фото работ вообще не идут через тело
  // экшена.
  async function uploadOriginalDirect(rawFile: File): Promise<string> {
    const ext = rawFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `originals/${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabaseBrowser.storage.from(bucket).upload(path, rawFile, { contentType: rawFile.type, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    return path;
  }

  function pickFromLibrary(asset: { bucket: 'works' | 'site'; path: string }) {
    chooseTokenRef.current++;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setFile(null);
    setInputFile(null);
    setPreviewUrl(null);
    setMediaPath(asset.path);
    setRemove(false);
    setLibraryOpen(false);
    // У файла из медиатеки нет отдельного «оригинала» — если его потом
    // обрежут, applyCrop подставит этот же путь в качестве оригинала (см.
    // ниже). Если сразу сохранить без кропа, сервер сделает то же самое.
    setSessionOriginalPath(null);
    setOriginalUploadError(null);
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
    const token = ++chooseTokenRef.current;
    setInputFile(null); // сразу очищаем реальный input, пока идёт конвертация — не отправить сырой файл при преждевременном сабмите
    setConverting(true);
    // Новый файл — предыдущий известный оригинал (если был) больше не
    // относится к делу, начинаем сначала.
    setSessionOriginalPath(null);
    setOriginalUploadError(null);
    try {
      // Конвертация в WebP обязательна для любой загрузки, не только через
      // редактор кадрирования (тот тоже выдаёт WebP, но сам опционален) —
      // см. lib/utils/image-client.ts.
      const optimized = await convertToWebp(next);
      if (chooseTokenRef.current !== token) return; // выбор уже устарел — пользователь успел выбрать другой файл
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(optimized);
      objectUrlRef.current = url;
      setFile(optimized);
      setInputFile(optimized);
      setPreviewUrl(url);
      setRemove(false);
      setMediaPath(null);
    } finally {
      if (chooseTokenRef.current === token) setConverting(false);
    }
    if (chooseTokenRef.current !== token) return;

    // Параллельно грузим НЕТРОНУТЫЙ исходник (next, а не optimized) — не
    // блокируя предпросмотр/выбор файла этим ожиданием.
    setOriginalUploading(true);
    uploadOriginalDirect(next)
      .then((path) => { if (chooseTokenRef.current === token) setSessionOriginalPath(path); })
      .catch(() => { if (chooseTokenRef.current === token) setOriginalUploadError('Не удалось сохранить оригинал для повторного кадрирования в будущем. Само изображение при этом сохранится нормально.'); })
      .finally(() => { if (chooseTokenRef.current === token) setOriginalUploading(false); });
  }

  function openEditor() {
    // См. комментарий у originalUploading ниже: пока фоновая загрузка ещё не
    // завершилась, единственный источник для кропа — уже готовый (возможно,
    // обрезанный) previewUrl, а это ровно тот баг, который originalPath
    // должен был исключить. Проще на секунду заблокировать кнопку (кнопки
    // ниже уже это делают через disabled={originalUploading}), чем открыть
    // редактор от неправильного источника.
    if (originalUploading) return;
    // Приоритет источника для кропа: несжатый оригинал этой сессии → оригинал
    // из БД (если картинку ещё не трогали сейчас, но original уже был
    // сохранён раньше) → предпросмотр/медиатека/существующий путь как есть
    // (для записей без сохранённого оригинала — честно кадрируем то, что
    // есть, другого источника физически нет).
    const source = sessionOriginalPath
      ? assetUrl(sessionOriginalPath)
      : (!file && !mediaPath && existingOriginalPath ? assetUrl(existingOriginalPath) : currentUrl);
    if (source) setEditorSource(source);
  }

  function applyCrop(nextFile: File, url: string) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
    setFile(nextFile);
    setPreviewUrl(url);
    setInputFile(nextFile);
    setRemove(false);
    // Если оригинал этой сессии ещё не известен, но кроп был сделан либо от
    // уже сохранённого в БД оригинала (existingOriginalPath), либо от файла
    // из медиатеки (mediaPath) — тот путь и есть настоящий оригинал, второй
    // раз грузить его не нужно, только запоминаем как sessionOriginalPath.
    setSessionOriginalPath((current) => current ?? (mediaPath ? mediaPath : existingOriginalPath ?? null));
    // Если источником для кадрирования был файл из медиатеки (mediaPath),
    // после кропа это уже самостоятельный новый файл — отправлять его нужно
    // как обычную загрузку (через file), а не как ссылку на старый путь в
    // медиатеке. Без этой строки mediaPath оставался бы в состоянии (хоть
    // сервер и игнорирует его при наличии file) — просто лишнее, спутанное
    // состояние.
    setMediaPath(null);
    setEditorSource(null);
  }

  function clear() {
    chooseTokenRef.current++;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setInputFile(null);
    setRemove(true);
    setMediaPath(null);
    setEditorSource(null);
    setSessionOriginalPath(null);
    setOriginalUploadError(null);
  }

  return (
    <div className="border border-ink/10 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm text-ink/90">{label}</p>{help && <button type="button" onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp} className="admin-image-help-button mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/20 text-[10px] leading-none text-ink/60 transition-colors hover:border-ink/45 hover:text-ink sm:h-5 sm:w-5 sm:rounded-none" aria-label={`Что такое: ${label}`}>i</button>}</div>{help && showHelp && <p className="mt-2 max-w-[42ch] text-xs leading-5 text-ink/55 sm:max-w-[42ch]">{help}</p>}</div>
        {currentUrl && <button type="button" onClick={openEditor} disabled={originalUploading} title={originalUploading ? 'Дождитесь подготовки оригинала' : undefined} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/70 hover:border-ink/40 hover:text-ink disabled:cursor-wait disabled:opacity-40">Редактировать</button>}
      </div>

      <div className={`mt-4 overflow-hidden border border-ink/10 bg-black ${compact ? 'aspect-[4/3] max-w-sm' : 'aspect-[4/3]'}`}>
        {currentUrl ? <img src={currentUrl} alt="Предпросмотр" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/35">Изображение не выбрано</div>}
      </div>

      {converting && <p className="mt-3 text-[11px] leading-5 text-ink/70">Оптимизируем изображение…</p>}
      {!converting && file && <p className="mt-3 text-[11px] leading-5 text-ink/70">Новое изображение подготовлено. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}
      {originalUploading && <p className="mt-3 text-[11px] leading-5 text-ink/70">Готовим оригинал для будущего повторного кадрирования…</p>}
      {originalUploadError && <p role="alert" className="mt-3 text-[11px] leading-5 text-amber-600">{originalUploadError}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <label className={`border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink ${converting ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
          {currentUrl ? 'Заменить' : 'Выбрать'}
          <input ref={inputRef} type="file" name={fieldName} disabled={converting} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files)} />
        </label>
        <button type="button" onClick={() => setLibraryOpen(true)} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink">
          Открыть галерею
        </button>
        {currentUrl && <button type="button" onClick={clear} className="border border-danger/20 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-danger hover:border-danger/50">Удалить</button>}
        {file && <button type="button" onClick={openEditor} disabled={originalUploading} title={originalUploading ? 'Дождитесь подготовки оригинала' : undefined} className="border border-ink/15 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink disabled:cursor-wait disabled:opacity-40">Обрезать</button>}
      </div>

      {mediaPath && <p className="mt-3 text-[11px] leading-5 text-ink/70">Выбрано из медиатеки. Оно ещё не сохранено — нажмите кнопку сохранения этой формы.</p>}
      {remove && <input type="hidden" name={`${fieldName}_remove`} value="1" />}
      {mediaPath && <input type="hidden" name={`${fieldName}_media_path`} value={mediaPath} />}
      {sessionOriginalPath && <input type="hidden" name={`${fieldName}_original_path`} value={sessionOriginalPath} />}
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
