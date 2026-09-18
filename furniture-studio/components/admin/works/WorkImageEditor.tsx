'use client';

import Image from 'next/image';
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, workImageUrl } from '@/lib/utils/image';
import { convertToWebp } from '@/lib/utils/image-client';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { ImageCropDialog } from '@/components/admin/shared/ImageCropDialog';
import { CatalogImageSettingsDialog } from '@/components/admin/shared/CatalogImageSettingsDialog';
import { MediaLibraryPicker } from '@/components/admin/shared/MediaLibraryPicker';
import { copyMediaAssetFile } from '@/lib/actions/media';

type UploadStatus = 'uploading' | 'done' | 'error';
// file опционален: фото, добавленное кнопкой «Добавить из галереи», уже
// скопировано на сервере в Storage (см. copyMediaAssetFile) — у него сразу
// есть path и status 'done', а File-объект в браузере отсутствует.
interface PendingNewImage { id: string; file?: File; url: string; status: UploadStatus; path?: string; originalPath?: string; errorMessage?: string }
interface PendingReplacement { id: string; file: File; url: string; status: UploadStatus; path?: string; originalPath?: string; errorMessage?: string }

const MAX_MB = Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024));

export function WorkImageEditor({
  images,
  coverImageId,
  workId,
  onBusyChange,
  onDirty,
}: {
  images: WorkImageWithUrl[];
  coverImageId: string | null;
  workId?: string | null;
  onBusyChange?: (busy: boolean) => void;
  // Вызывается при любом изменении, которое реально уйдёт на сервер при
  // следующем сохранении формы, но само по себе не является нативным
  // "change" события DOM-поля (выбор фото из медиатеки, правка карточки
  // каталога) — поэтому не долетело бы до onChange на самой <form>.
  onDirty?: () => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [isCopying, startCopyTransition] = useTransition();
  // Синхронный лок поверх isCopying: React обновляет isCopying асинхронно,
  // а MediaLibraryPicker ничего не знает о процессе копирования и не
  // блокирует свои плитки на время запроса. Без этого лока быстрый повторный
  // клик по той же (или другой) миниатюре до ответа сервера успевал уйти
  // вторым вызовом copyMediaAssetFile и добавлял фото дважды.
  const copyLockRef = useRef(false);

  function pickFromLibrary(asset: { bucket: 'works' | 'site'; path: string }) {
    if (!workId || copyLockRef.current) return;
    copyLockRef.current = true;
    setLibraryError(null);
    startCopyTransition(async () => {
      try {
        // Копируем байты в папку товара, но НЕ привязываем к work_images
        // здесь — файл ложится в общий список "новых фотографий" рядом с
        // обычной загрузкой и попадает в товар только при нажатии «Сохранить
        // изменения» внизу формы, как и любое другое фото.
        const result = await copyMediaAssetFile(workId, asset.path);
        if (!result.success || !result.path) { setLibraryError(result.message); return; }
        const id = `new:${crypto.randomUUID()}`;
        const added: PendingNewImage = { id, url: workImageUrl(result.path), status: 'done', path: result.path, originalPath: result.path };
        setNewImages((items) => [...items, added]);
        setSelectedCover((current) => current ?? id);
        setLibraryOpen(false);
      } finally {
        copyLockRef.current = false;
      }
    });
  }

  // Клиент для загрузки байт напрямую в Supabase Storage из браузера, минуя
  // тело Server Action целиком (см. lib/actions/works.ts:syncWorkImages —
  // там подробно объяснено, какую проблему это решает). Сессия у браузерного
  // клиента та же, что и на сервере (общие cookie через @supabase/ssr), так
  // что RLS-политика "authenticated" для work_images/Storage выполняется.
  const supabaseBrowser = useMemo(() => createBrowserSupabaseClient(), []);

  // Для уже существующего товара грузим фото сразу в его собственную папку.
  // Для ещё не сохранённого товара (страница создания) реального id пока
  // нет — используем случайный временный префикс только как имя папки в
  // Storage; на итоговую связь с записью в work_images это никак не влияет
  // (там просто хранится сам путь, а не то, из какой он папки).
  const folderIdRef = useRef<string>(workId || `pending-${crypto.randomUUID()}`);

  const newInputRef = useRef<HTMLInputElement>(null);
  const [newImages, setNewImages] = useState<PendingNewImage[]>([]);
  const [replacements, setReplacements] = useState<PendingReplacement[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string | null>(coverImageId);
  const [editor, setEditor] = useState<{ kind: 'existing' | 'new'; id: string; sourceUrl: string } | null>(null);
  const [catalogEditor, setCatalogEditor] = useState<WorkImageWithUrl | null>(null);
  // Настройки карточки (позиция/масштаб/зеркало), применённые в диалоге, но
  // ещё не сохранённые формой — применяются на сервере только при сабмите
  // (см. runCatalogSettings в lib/actions/works.ts).
  const [catalogOverrides, setCatalogOverrides] = useState<Record<string, { x: number; y: number; zoom: number; flip: boolean }>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    newImages.forEach((item) => URL.revokeObjectURL(item.url));
    replacements.forEach((item) => URL.revokeObjectURL(item.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Родительская форма должна блокировать «Сохранить», пока фото ещё летят в
  // Storage — иначе можно нажать сохранить в момент, когда путь для только
  // что выбранного файла ещё не готов, и файл тихо потеряется.
  useEffect(() => {
    const busy = newImages.some((item) => item.status === 'uploading') || replacements.some((item) => item.status === 'uploading');
    onBusyChange?.(busy);
  }, [newImages, replacements, onBusyChange]);

  useEffect(() => {
    const hasPendingChanges =
      newImages.length > 0 || replacements.length > 0 || deleted.length > 0 || selectedCover !== coverImageId || Object.keys(catalogOverrides).length > 0;
    if (hasPendingChanges) onDirty?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newImages, replacements, deleted, selectedCover, catalogOverrides]);

  const visibleExisting = images.filter((image) => !deleted.includes(image.id));

  async function uploadToStorage(file: File): Promise<string> {
    // Конвертация в WebP — обязательный шаг для ЛЮБОЙ загрузки, а не только
    // когда админ открыл редактор кадрирования (тот тоже выдаёт WebP, но
    // сам по себе опционален). Иначе фото, добавленные без кадрирования,
    // так и остаются в Storage в исходном PNG/JPEG навсегда. См.
    // lib/utils/image-client.ts.
    const optimized = await convertToWebp(file);
    const ext = optimized.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${folderIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabaseBrowser.storage.from('works').upload(path, optimized, {
      contentType: optimized.type,
      cacheControl: '31536000',
    });
    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  async function uploadOriginal(file: File, suffix = 'original') {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${folderIdRef.current}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}.${ext}`;
    const { error: uploadError } = await supabaseBrowser.storage.from('works').upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (uploadError) throw new Error(uploadError.message);
    return path;
  }

  async function uploadOriginalFromUrl(sourceUrl: string) {
    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Не удалось подготовить оригинал');
    const blob = await response.blob();
    const file = new File([blob], `original-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
    return uploadOriginal(file);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const valid = incoming.filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES);
    if (valid.length !== incoming.length) setError(`Некоторые файлы не добавлены. Разрешены JPEG, PNG, WebP до ${MAX_MB} МБ.`);
    const added: Array<PendingNewImage & { file: File }> = valid.map((file) => ({ id: `new:${crypto.randomUUID()}`, file, url: URL.createObjectURL(file), status: 'uploading' }));
    if (added.length === 0) return;
    setNewImages((items) => [...items, ...added]);
    if (!selectedCover && added[0]) setSelectedCover(added[0].id);

    added.forEach((item) => {
      Promise.all([uploadToStorage(item.file), uploadOriginal(item.file)])
        .then(([path, originalPath]) => setNewImages((items) => items.map((i) => (i.id === item.id ? { ...i, status: 'done', path, originalPath } : i))))
        .catch(() => setNewImages((items) => items.map((i) => (i.id === item.id ? { ...i, status: 'error', errorMessage: 'Не удалось загрузить файл.' } : i))));
    });
  }

  function retryNewUpload(id: string) {
    const item = newImages.find((i) => i.id === id);
    if (!item || !item.file) return;
    setNewImages((items) => items.map((i) => (i.id === id ? { ...i, status: 'uploading', errorMessage: undefined } : i)));
    Promise.all([uploadToStorage(item.file), uploadOriginal(item.file)])
      .then(([path, originalPath]) => setNewImages((items) => items.map((i) => (i.id === id ? { ...i, status: 'done', path, originalPath } : i))))
      .catch(() => setNewImages((items) => items.map((i) => (i.id === id ? { ...i, status: 'error', errorMessage: 'Не удалось загрузить файл.' } : i))));
  }

  function retryReplacementUpload(id: string) {
    const item = replacements.find((i) => i.id === id);
    if (!item) return;
    setReplacements((items) => items.map((i) => (i.id === id ? { ...i, status: 'uploading', errorMessage: undefined } : i)));
    uploadToStorage(item.file)
      .then((path) => setReplacements((items) => items.map((i) => (i.id === id ? { ...i, status: 'done', path } : i))))
      .catch(() => setReplacements((items) => items.map((i) => (i.id === id ? { ...i, status: 'error', errorMessage: 'Не удалось загрузить файл.' } : i))));
  }

  function removeNew(id: string) {
    setNewImages((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.path) supabaseBrowser.storage.from('works').remove([target.path]).catch(() => {});
      if (target?.url) URL.revokeObjectURL(target.url);
      return items.filter((item) => item.id !== id);
    });
    if (selectedCover === id) setSelectedCover(visibleExisting[0]?.id ?? newImages.find((item) => item.id !== id)?.id ?? null);
  }

  function removeExisting(id: string) {
    setDeleted((items) => (items.includes(id) ? items : [...items, id]));
    setCatalogOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setReplacements((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.path) supabaseBrowser.storage.from('works').remove([target.path]).catch(() => {});
      if (target?.url) URL.revokeObjectURL(target.url);
      return items.filter((item) => item.id !== id);
    });
    if (selectedCover === id) {
      const fallback = visibleExisting.find((item) => item.id !== id)?.id ?? newImages[0]?.id ?? null;
      setSelectedCover(fallback);
    }
  }

  function startExistingEdit(image: WorkImageWithUrl) {
    const replacement = replacements.find((item) => item.id === image.id);
    // Если в этой же сессии уже сделана замена (с кропом) — replacement.url
    // указывает на УЖЕ ОБРЕЗАННЫЙ результат той правки, а не на исходник.
    // replacement.originalPath к этому моменту уже вычислен (см. applyEdit)
    // и указывает на настоящий несжатый оригинал — его и берём в приоритете,
    // иначе повторный кроп стартовал бы не от оригинала, а от предыдущего
    // кропа (тот же класс бага, что чинили у startNewEdit ниже).
    const sourceUrl = replacement?.originalPath
      ? workImageUrl(replacement.originalPath)
      : (replacement?.url ?? (image.original_path ? workImageUrl(image.original_path) : image.url));
    setEditor({ kind: 'existing', id: image.id, sourceUrl });
  }

  function startNewEdit(image: PendingNewImage) {
    // Раньше здесь всегда брался image.url — превью, которое после первого
    // кропа в этой же сессии уже указывает на ОБРЕЗАННЫЙ результат (см.
    // applyEdit: url перезаписывается результатом кропа). originalPath при
    // этом уже корректно вычислен и лежит в состоянии с самого первого
    // аплоада (addFiles) — просто не использовался тут. Берём его в
    // приоритете, как и в startExistingEdit.
    const sourceUrl = image.originalPath ? workImageUrl(image.originalPath) : image.url;
    setEditor({ kind: 'new', id: image.id, sourceUrl });
  }

  function applyEdit(file: File, url: string) {
    if (!editor) return;
    if (editor.kind === 'existing') {
      const previous = replacements.find((item) => item.id === editor.id);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      if (previous?.path) supabaseBrowser.storage.from('works').remove([previous.path]).catch(() => {});
      const sourceImage = images.find((item) => item.id === editor.id);
      setReplacements((items) => [...items.filter((item) => item.id !== editor.id), { id: editor.id, file, url, status: 'uploading' }]);
      const originalPromise = sourceImage?.original_path ? Promise.resolve(sourceImage.original_path) : uploadOriginalFromUrl(editor.sourceUrl);
      Promise.all([uploadToStorage(file), originalPromise])
        .then(([path, originalPath]) => setReplacements((items) => items.map((i) => (i.id === editor.id ? { ...i, status: 'done', path, originalPath } : i))))
        .catch(() => setReplacements((items) => items.map((i) => (i.id === editor.id ? { ...i, status: 'error', errorMessage: 'Не удалось загрузить файл.' } : i))));
    } else {
      const previous = newImages.find((item) => item.id === editor.id);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      // ВАЖНО: для фото, добавленного из медиатеки, path и originalPath —
      // один и тот же файл (см. pickFromLibrary — там нет отдельного
      // "оригинала", только скопированный файл). Если удалить его здесь
      // сразу, ниже мы всё равно попытаемся использовать этот же путь как
      // originalPath для сохранения — получится ссылка на уже удалённый
      // файл. Поэтому удаляем старый файл из Storage, только если он не
      // используется одновременно как "оригинал" (для обычной загрузки с
      // диска originalPath — это всегда отдельный, другой файл, так что
      // тут ничего не меняется).
      if (previous?.path && previous.path !== previous.originalPath) {
        supabaseBrowser.storage.from('works').remove([previous.path]).catch(() => {});
      }
      setNewImages((items) => items.map((item) => (item.id === editor.id ? { ...item, file, url, status: 'uploading', path: undefined } : item)));
      Promise.all([uploadToStorage(file), previous?.originalPath ? Promise.resolve(previous.originalPath) : uploadOriginal(file)])
        .then(([path, originalPath]) => setNewImages((items) => items.map((i) => (i.id === editor.id ? { ...i, status: 'done', path, originalPath } : i))))
        .catch(() => setNewImages((items) => items.map((i) => (i.id === editor.id ? { ...i, status: 'error', errorMessage: 'Не удалось загрузить файл.' } : i))));
    }
    setEditor(null);
  }

  return (
    <section className="border border-ink/10 bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">фотографии</p>
          <h2 className="mt-1 text-xl text-ink">Галерея работы</h2>
          <p className="mt-2 max-w-[72ch] text-xs leading-5 text-ink/60">
            Фото загружаются в хранилище сразу при выборе. Удаление старых фото, порядок и обложка применяются только после кнопки «Сохранить изменения» внизу.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {workId && (
            <button type="button" onClick={() => setLibraryOpen(true)} disabled={isCopying} className="border border-ink/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink disabled:opacity-50">
              {isCopying ? 'Копируем…' : 'Добавить из галереи'}
            </button>
          )}
          <label className="cursor-pointer border border-ink/20 bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas hover:bg-ink/90">
            + Добавить фотографии
            <input
              ref={newInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
        </div>
      </div>

      {!workId && <p className="mt-3 text-xs text-ink/45">Добавление из галереи будет доступно после первого сохранения работы.</p>}
      {libraryError && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs text-red-200">{libraryError}</p>}
      {error && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs text-red-200">{error}</p>}
      {libraryOpen && <MediaLibraryPicker bucket="works" onClose={() => setLibraryOpen(false)} onSelect={pickFromLibrary} />}

      <div
        className={`mt-5 border border-dashed px-4 py-3 text-center text-[10px] uppercase tracking-[0.14em] transition-colors ${dragging ? 'border-ink/45 bg-ink/[0.06] text-ink' : 'border-ink/10 text-ink/35'}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
      >
        {dragging ? 'Перетащите фотографии сюда' : 'Можно также перетащить фотографии сюда'}
      </div>

      <div className="mt-6 grid gap-px bg-ink/10 sm:grid-cols-2 xl:grid-cols-3">
        {visibleExisting.map((image, index) => {
          const replacement = replacements.find((item) => item.id === image.id);
          return (
            <div key={image.id} className="bg-canvas">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={replacement?.url ?? image.url} alt={image.alt_text ?? ''} fill sizes="(min-width:1280px) 30vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
                {selectedCover === image.id && <span className="absolute left-2 top-2 border border-white/20 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white">Обложка</span>}
                <span className="absolute right-2 top-2 bg-black/65 px-2 py-1 text-[9px] text-white/75">{String(index + 1).padStart(2, '0')}</span>
                {replacement?.status === 'uploading' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] uppercase tracking-[0.12em] text-white">Загружаем замену…</span>
                )}
                {replacement?.status === 'error' && (
                  <button type="button" onClick={() => retryReplacementUpload(image.id)} className="absolute inset-0 flex items-center justify-center bg-red-950/75 text-center text-[9px] uppercase tracking-[0.12em] text-red-100">
                    Не удалось загрузить — повторить
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-px bg-ink/10">
                <button type="button" onClick={() => setSelectedCover(image.id)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-ink/70 hover:text-ink">Обложка</button>
                <button type="button" onClick={() => startExistingEdit(image)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-ink/70 hover:text-ink">Правка</button>
                <button
                  type="button"
                  onClick={() => {
                    const override = catalogOverrides[image.id];
                    setCatalogEditor(override ? { ...image, catalog_position_x: override.x, catalog_position_y: override.y, catalog_zoom: override.zoom, catalog_flip_horizontal: override.flip } : image);
                  }}
                  className={`bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] hover:text-ink ${catalogOverrides[image.id] ? 'text-ink' : 'text-ink/70'}`}
                >
                  Карточка{catalogOverrides[image.id] ? ' •' : ''}
                </button>
                <button type="button" onClick={() => removeExisting(image.id)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-red-200/80 hover:text-red-100">Удалить</button>
              </div>
            </div>
          );
        })}

        {newImages.map((image) => (
          <div key={image.id} className="border border-dashed border-ink/20 bg-canvas">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={image.url} alt="Новое изображение" className="h-full w-full object-cover" />
              {selectedCover === image.id && <span className="absolute left-2 top-2 border border-white/20 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white">Обложка</span>}
              {image.status === 'uploading' && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[9px] uppercase tracking-[0.12em] text-white">Загружаем…</span>
              )}
              {image.status === 'error' && (
                <button type="button" onClick={() => retryNewUpload(image.id)} className="absolute inset-0 flex items-center justify-center bg-red-950/75 text-center text-[9px] uppercase tracking-[0.12em] text-red-100">
                  Не удалось загрузить — повторить
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-px bg-ink/10">
              <button type="button" onClick={() => setSelectedCover(image.id)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-ink/70 hover:text-ink">Обложка</button>
              <button type="button" onClick={() => startNewEdit(image)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-ink/70 hover:text-ink">Правка</button>
              <button type="button" onClick={() => removeNew(image.id)} className="bg-surface px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-red-200/80 hover:text-red-100">Удалить</button>
            </div>
          </div>
        ))}

        {visibleExisting.length === 0 && newImages.length === 0 && (
          <div className="col-span-full border border-dashed border-ink/15 py-16 text-center text-xs text-ink/45">Фотографий пока нет. Добавьте несколько изображений одной кнопкой.</div>
        )}
      </div>

      {replacements.filter((item) => item.status === 'done' && item.path).map((item) => (
        <Fragment key={item.id}>
          <input type="hidden" name="replace_image_ids" value={item.id} />
          <input type="hidden" name="replace_image_paths" value={item.path} />
          <input type="hidden" name="replace_image_original_paths" value={item.originalPath ?? ""} />
        </Fragment>
      ))}
      {deleted.map((id) => <input key={id} type="hidden" name="delete_image_ids" value={id} />)}
      {newImages.filter((item) => item.status === 'done' && item.path).map((item) => (
        <Fragment key={item.id}>
          <input type="hidden" name="new_image_ids" value={item.id} />
          <input type="hidden" name="new_image_paths" value={item.path} />
          <input type="hidden" name="new_image_original_paths" value={item.originalPath ?? ""} />
        </Fragment>
      ))}
      <input type="hidden" name="cover_image_id" value={selectedCover ?? ''} />
      {Object.entries(catalogOverrides).map(([id, override]) => (
        <Fragment key={id}>
          <input type="hidden" name="catalog_settings_ids" value={id} />
          <input type="hidden" name="catalog_settings_x" value={override.x} />
          <input type="hidden" name="catalog_settings_y" value={override.y} />
          <input type="hidden" name="catalog_settings_zoom" value={override.zoom} />
          <input type="hidden" name="catalog_settings_flip" value={String(override.flip)} />
        </Fragment>
      ))}

      {catalogEditor && (
        <CatalogImageSettingsDialog
          image={catalogEditor}
          onClose={() => setCatalogEditor(null)}
          onSaved={(settings) => {
            setCatalogOverrides((prev) => ({
              ...prev,
              [catalogEditor.id]: { x: settings.catalog_position_x, y: settings.catalog_position_y, zoom: settings.catalog_zoom, flip: settings.catalog_flip_horizontal },
            }));
            setCatalogEditor(null);
          }}
        />
      )}
      {editor && <ImageCropDialog sourceUrl={editor.sourceUrl} initialRatio={4 / 3} onCancel={() => setEditor(null)} onApply={applyEdit} title="Редактирование фотографии" />}
    </section>
  );
}
