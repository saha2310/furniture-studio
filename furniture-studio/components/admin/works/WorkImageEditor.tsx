'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

const RATIOS = [
  { label: 'Свободный', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
];

type PendingReplace = { id: string; file: File; url: string };

export function WorkImageEditor({ images, coverImageId }: { images: WorkImageWithUrl[]; coverImageId: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [replacements, setReplacements] = useState<PendingReplace[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [editing, setEditing] = useState<WorkImageWithUrl | null>(null);
  const [ratio, setRatio] = useState<number | null>(4 / 3);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCover, setSelectedCover] = useState<string | null>(coverImageId);

  const visibleImages = images.filter((img) => !deleted.includes(img.id));

  function syncInput(files: File[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    inputRef.current.files = dt.files;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const valid = incoming.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024);
    if (valid.length !== incoming.length) setError('Некоторые файлы пропущены: нужны JPEG, PNG или WebP до 8 МБ.');
    const next = [...newFiles, ...valid];
    setNewFiles(next);
    syncInput([...replacements.map((r) => r.file), ...next]);
  }

  function removeNew(index: number) {
    const next = newFiles.filter((_, i) => i !== index);
    setNewFiles(next);
    syncInput([...replacements.map((r) => r.file), ...next]);
  }

  function removeExisting(id: string) {
    const next = replacements.filter((r) => r.id !== id);
    setDeleted((v) => [...v, id]);
    setReplacements(next);
    syncInput([...next.map((r) => r.file), ...newFiles]);
  }

  function startEdit(image: WorkImageWithUrl) {
    setEditing(image);
    setRatio(4 / 3);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function saveCrop() {
    if (!editing) return;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = editing.url;
    image.onload = () => {
      const cropW = 1200;
      const cropH = ratio ? Math.round(cropW / ratio) : Math.round((cropW * image.naturalHeight) / image.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = cropW; canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const scale = Math.max(cropW / image.naturalWidth, cropH / image.naturalHeight) * zoom;
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const x = (cropW - drawW) / 2 + offset.x;
      const y = (cropH - drawH) / 2 + offset.y;
      ctx.drawImage(image, x, y, drawW, drawH);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `${editing.id}-cropped.webp`, { type: 'image/webp' });
        const next = [...replacements.filter((r) => r.id !== editing.id), { id: editing.id, file, url: URL.createObjectURL(blob) }];
        setReplacements(next);
        syncInput([...next.map((r) => r.file), ...newFiles]);
        setEditing(null);
      }, 'image/webp', 0.9);
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
  }
  function onPointerUp() { drag.current = null; }

  return (
    <div className="border border-white/10 bg-[#1b1a18] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink">Фотографии</p>
          <p className="mt-1 text-xs leading-5 text-espresso">Изменения изображений сохраняются вместе с основной кнопкой «Сохранить изменения».</p>
        </div>
        <label className="cursor-pointer border border-white/20 px-4 py-2 text-[10px] uppercase tracking-[.14em] text-ink hover:bg-white hover:text-black">
          Добавить изображения
          <input ref={inputRef} type="file" name="work_files" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleImages.map((image) => {
          const replacement = replacements.find((r) => r.id === image.id);
          return (
            <div key={image.id} className="group border border-white/10 bg-[#141413]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={replacement?.url || image.url} alt={image.alt_text || ''} fill sizes="300px" className="object-cover" />
                {image.id === selectedCover && <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[9px] uppercase tracking-wider text-black">Обложка</span>}
              </div>
              <div className="grid grid-cols-3 gap-px bg-white/10">
                <button type="button" onClick={() => setSelectedCover(image.id)} className={`bg-[#1b1a18] px-2 py-2 text-[10px] uppercase tracking-wider ${selectedCover === image.id ? 'text-white' : 'text-espresso hover:text-white'}`}>Обложка</button>
                <button type="button" onClick={() => startEdit(image)} className="bg-[#1b1a18] px-2 py-2 text-[10px] uppercase tracking-wider text-espresso hover:text-white">Обрезать</button>
                <button type="button" onClick={() => removeExisting(image.id)} className="bg-[#1b1a18] px-2 py-2 text-[10px] uppercase tracking-wider text-espresso hover:text-red-300">Удалить</button>
              </div>
            </div>
          );
        })}
        {newFiles.map((file, i) => (
          <div key={`${file.name}-${i}`} className="border border-dashed border-white/15 bg-[#141413]">
            <div className="relative aspect-[4/3] overflow-hidden"><img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" /></div>
            <div className="flex items-center justify-between gap-2 p-2 text-[10px] text-espresso"><span className="truncate">Новое изображение</span><button type="button" onClick={() => removeNew(i)} className="hover:text-red-300">Удалить</button></div>
          </div>
        ))}
      </div>

      {selectedCover && <input type="hidden" name="cover_image_id" value={selectedCover} />}
      {deleted.map((id) => <input key={id} type="hidden" name="delete_image_ids" value={id} />)}
      {replacements.map((r) => <input key={r.id} type="hidden" name="replace_image_ids" value={r.id} />)}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl border border-white/15 bg-[#171716] p-5 sm:p-7">
            <div className="flex items-center justify-between"><div><p className="eyebrow">редактор изображения</p><h3 className="mt-2 text-xl">Обрезать фотографию</h3></div><button type="button" onClick={() => setEditing(null)} className="text-2xl text-espresso hover:text-white">×</button></div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,260px]">
              <div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-black" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
                <img src={editing.url} alt="" className="absolute left-1/2 top-1/2 max-h-none max-w-none select-none" style={{ width: `${Math.max(100, zoom * 100)}%`, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} draggable={false} />
                <div className="pointer-events-none absolute inset-6 border border-white/70" style={ratio ? { aspectRatio: String(ratio), top: '50%', left: '50%', right: 'auto', bottom: 'auto', width: '80%', transform: 'translate(-50%, -50%)' } : { inset: 24 }} />
                <div className="pointer-events-none absolute inset-0 bg-black/20" />
              </div>
              <div className="space-y-6">
                <div><p className="eyebrow">формат</p><div className="mt-3 flex flex-wrap gap-2">{RATIOS.map((r) => <button key={r.label} type="button" onClick={() => setRatio(r.value)} className={`border px-3 py-2 text-xs ${ratio === r.value ? 'border-white bg-white text-black' : 'border-white/20 text-espresso'}`}>{r.label}</button>)}</div></div>
                <div><p className="eyebrow">масштаб</p><input className="mt-4 w-full" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></div>
                <p className="text-xs leading-5 text-espresso">Перетаскивайте изображение мышью или пальцем. Масштаб меняется ползунком.</p>
                <div className="flex gap-3"><button type="button" onClick={() => setEditing(null)} className="border border-white/20 px-4 py-2 text-xs">Отмена</button><button type="button" onClick={saveCrop} className="bg-white px-4 py-2 text-xs text-black">Применить обрезку</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
