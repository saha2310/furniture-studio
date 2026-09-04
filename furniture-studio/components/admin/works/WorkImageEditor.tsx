'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { ImageCropDialog } from '@/components/admin/shared/ImageCropDialog';

interface PendingNewImage { id: string; file: File; url: string }
interface PendingReplacement { id: string; file: File; url: string }

export function WorkImageEditor({ images, coverImageId }: { images: WorkImageWithUrl[]; coverImageId: string | null }) {
  const newInputRef = useRef<HTMLInputElement>(null);
  const [newImages, setNewImages] = useState<PendingNewImage[]>([]);
  const [replacements, setReplacements] = useState<PendingReplacement[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState<string | null>(coverImageId);
  const [editor, setEditor] = useState<{ kind: 'existing' | 'new'; id: string; sourceUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    newImages.forEach((item) => URL.revokeObjectURL(item.url));
    replacements.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const visibleExisting = images.filter((image) => !deleted.includes(image.id));

  function setNewInputFiles(items: PendingNewImage[]) {
    if (!newInputRef.current) return;
    const dt = new DataTransfer();
    items.forEach((item) => dt.items.add(item.file));
    newInputRef.current.files = dt.files;
  }

  function replaceInputFiles(items: PendingReplacement[]) {
    const input = document.querySelector<HTMLInputElement>('input[name="replace_work_files"]');
    if (!input) return;
    const dt = new DataTransfer();
    items.forEach((item) => dt.items.add(item.file));
    input.files = dt.files;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const valid = incoming.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES);
    if (valid.length !== incoming.length) setError('Некоторые файлы не добавлены. Разрешены JPEG, PNG, WebP до 8 МБ.');
    const added = valid.map((file) => ({ id: `new:${crypto.randomUUID()}`, file, url: URL.createObjectURL(file) }));
    const next = [...newImages, ...added];
    setNewImages(next);
    setNewInputFiles(next);
    if (!selectedCover && added[0]) setSelectedCover(added[0].id);
  }

  function removeNew(id: string) {
    setNewImages((items) => {
      const next = items.filter((item) => item.id !== id);
      setNewInputFiles(next);
      return next;
    });
    if (selectedCover === id) setSelectedCover(visibleExisting[0]?.id ?? newImages.find((item) => item.id !== id)?.id ?? null);
  }

  function removeExisting(id: string) {
    setDeleted((items) => items.includes(id) ? items : [...items, id]);
    setReplacements((items) => {
      const next = items.filter((item) => item.id !== id);
      replaceInputFiles(next);
      return next;
    });
    if (selectedCover === id) {
      const fallback = visibleExisting.find((item) => item.id !== id)?.id ?? newImages[0]?.id ?? null;
      setSelectedCover(fallback);
    }
  }

  function startExistingEdit(image: WorkImageWithUrl) {
    setEditor({ kind: 'existing', id: image.id, sourceUrl: replacements.find((item) => item.id === image.id)?.url ?? image.url });
  }

  function startNewEdit(image: PendingNewImage) {
    setEditor({ kind: 'new', id: image.id, sourceUrl: image.url });
  }

  function applyEdit(file: File, url: string) {
    if (!editor) return;
    if (editor.kind === 'existing') {
      setReplacements((items) => {
        const current = items.find((item) => item.id === editor.id);
        if (current) URL.revokeObjectURL(current.url);
        const next = [...items.filter((item) => item.id !== editor.id), { id: editor.id, file, url }];
        replaceInputFiles(next);
        return next;
      });
    } else {
      setNewImages((items) => {
        const current = items.find((item) => item.id === editor.id);
        if (current) URL.revokeObjectURL(current.url);
        const next = items.map((item) => item.id === editor.id ? { ...item, file, url } : item);
        setNewInputFiles(next);
        return next;
      });
    }
    setEditor(null);
  }

  return (
    <section className="border border-white/10 bg-[#171716] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">фотографии</p>
          <h2 className="mt-1 text-xl text-white">Галерея работы</h2>
          <p className="mt-2 max-w-[72ch] text-xs leading-5 text-white/60">Добавление, удаление и кадрирование пока являются изменениями формы. Они попадут в базу и Storage только после кнопки «Сохранить изменения» внизу.</p>
        </div>
        <label className="cursor-pointer border border-white/20 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-black hover:bg-white/90">
          + Добавить фотографии
          <input ref={newInputRef} type="file" name="new_work_files" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { addFiles(e.target.files); }} />
        </label>
      </div>

      {error && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs text-red-200">{error}</p>}

      <div
        className={`mt-5 border border-dashed px-4 py-3 text-center text-[10px] uppercase tracking-[0.14em] transition-colors ${dragging ? 'border-white/45 bg-white/[0.06] text-white' : 'border-white/10 text-white/35'}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
      >
        {dragging ? 'Перетащите фотографии сюда' : 'Можно также перетащить фотографии сюда'}
      </div>

      <div className="mt-6 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
        {visibleExisting.map((image, index) => {
          const replacement = replacements.find((item) => item.id === image.id);
          return (
            <div key={image.id} className="bg-[#111110]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={replacement?.url ?? image.url} alt={image.alt_text ?? ''} fill sizes="(min-width:1280px) 30vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
                {selectedCover === image.id && <span className="absolute left-2 top-2 border border-white/20 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white">Обложка</span>}
                <span className="absolute right-2 top-2 bg-black/65 px-2 py-1 text-[9px] text-white/75">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="grid grid-cols-3 gap-px bg-white/10">
                <button type="button" onClick={() => setSelectedCover(image.id)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-white/70 hover:text-white">Обложка</button>
                <button type="button" onClick={() => startExistingEdit(image)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-white/70 hover:text-white">Редактировать</button>
                <button type="button" onClick={() => removeExisting(image.id)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-red-200/80 hover:text-red-100">Удалить</button>
              </div>
            </div>
          );
        })}

        {newImages.map((image) => (
          <div key={image.id} className="border border-dashed border-white/20 bg-[#111110]">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={image.url} alt="Новое изображение" className="h-full w-full object-cover" />
              {selectedCover === image.id && <span className="absolute left-2 top-2 border border-white/20 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white">Обложка</span>}
            </div>
            <div className="grid grid-cols-3 gap-px bg-white/10">
              <button type="button" onClick={() => setSelectedCover(image.id)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-white/70 hover:text-white">Обложка</button>
              <button type="button" onClick={() => startNewEdit(image)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-white/70 hover:text-white">Редактировать</button>
              <button type="button" onClick={() => removeNew(image.id)} className="bg-[#171716] px-2 py-3 text-[9px] uppercase tracking-[0.11em] text-red-200/80 hover:text-red-100">Удалить</button>
            </div>
          </div>
        ))}

        {visibleExisting.length === 0 && newImages.length === 0 && (
          <div className="col-span-full border border-dashed border-white/15 py-16 text-center text-xs text-white/45">Фотографий пока нет. Добавьте несколько изображений одной кнопкой.</div>
        )}
      </div>

      <input type="file" name="replace_work_files" multiple className="hidden" readOnly aria-hidden="true" />
      {replacements.map((item) => <input key={item.id} type="hidden" name="replace_image_ids" value={item.id} />)}
      {deleted.map((id) => <input key={id} type="hidden" name="delete_image_ids" value={id} />)}
      {newImages.map((item) => <input key={item.id} type="hidden" name="new_image_ids" value={item.id} />)}
      <input type="hidden" name="cover_image_id" value={selectedCover ?? ''} />

      {editor && <ImageCropDialog sourceUrl={editor.sourceUrl} initialRatio={4 / 3} onCancel={() => setEditor(null)} onApply={applyEdit} title="Редактирование фотографии" />}
    </section>
  );
}
