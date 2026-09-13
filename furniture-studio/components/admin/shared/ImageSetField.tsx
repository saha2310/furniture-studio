'use client';

import { useRef, useState } from 'react';
import { siteAssetUrl, workImageUrl, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { MediaLibraryPicker } from './MediaLibraryPicker';

type Slot = { kind: 'existing'; path: string; bucket: 'works' | 'site' } | { kind: 'new'; id: string; file: File; url: string };

/**
 * Набор до `max` изображений с сохранением порядка, для карусели на
 * /contacts. На сервер уходят три поля:
 *  - `${name}_order` — JSON-массив токенов в правильном порядке
 *    (`existing:<bucket>:<путь>` или `new:<id>`), чтобы сервер мог
 *    восстановить порядок из перемешанных типов;
 *  - `${name}_existing` — повторяющиеся hidden-поля с путями уже
 *    существующих файлов (медиатека или ранее сохранённые);
 *  - `${name}_files` — реальный <input type="file" multiple> с новыми
 *    файлами для загрузки.
 */
export function ImageSetField({
  name,
  existing,
  max = 5,
  label,
  help,
}: {
  name: string;
  existing: { bucket: 'works' | 'site'; path: string }[];
  max?: number;
  label: string;
  help?: string;
}) {
  const [slots, setSlots] = useState<Slot[]>(existing.map((item) => ({ kind: 'existing', path: item.path, bucket: item.bucket })));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlOf = (slot: Slot) => (slot.kind === 'new' ? slot.url : slot.bucket === 'works' ? workImageUrl(slot.path) : siteAssetUrl(slot.path));

  function setFileInput(files: File[]) {
    if (!fileInputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    fileInputRef.current.files = dt.files;
  }

  function syncFileInput(nextSlots: Slot[]) {
    setFileInput(nextSlots.filter((s): s is Extract<Slot, { kind: 'new' }> => s.kind === 'new').map((s) => s.file));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = max - slots.length;
    if (room <= 0) return;
    const incoming = Array.from(list).slice(0, room);
    const valid = incoming.filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= MAX_IMAGE_SIZE_BYTES);
    const added: Slot[] = valid.map((file) => ({ kind: 'new', id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    const next = [...slots, ...added];
    setSlots(next);
    syncFileInput(next);
  }

  function addFromLibrary(asset: { bucket: 'works' | 'site'; path: string }) {
    if (slots.length >= max) return;
    setSlots((prev) => [...prev, { kind: 'existing', path: asset.path, bucket: asset.bucket }]);
    setLibraryOpen(false);
  }

  function remove(index: number) {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncFileInput(next);
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    setSlots((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      syncFileInput(next);
      return next;
    });
  }

  const orderTokens = slots.map((s) => (s.kind === 'existing' ? `existing:${s.bucket}:${s.path}` : `new:${s.id}`));

  return (
    <div className="border border-ink/10 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink/90">{label}</p>
          {help && <p className="mt-1 max-w-[52ch] text-xs leading-5 text-ink/55">{help}</p>}
        </div>
        <span className="shrink-0 text-[11px] text-ink/40">{slots.length} / {max}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {slots.map((slot, index) => (
          <div key={slot.kind === 'new' ? slot.id : slot.path} className="group relative aspect-[4/3] overflow-hidden border border-ink/10 bg-black">
            <img src={urlOf(slot)} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs text-white disabled:opacity-30">←</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === slots.length - 1} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs text-white disabled:opacity-30">→</button>
              </div>
              <button type="button" onClick={() => remove(index)} className="mt-1 rounded-full bg-red-400/25 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-red-100">Убрать</button>
            </div>
            <span className="absolute left-1.5 top-1.5 bg-black/60 px-1.5 py-0.5 text-[9px] text-white/80">{String(index + 1).padStart(2, '0')}</span>
          </div>
        ))}

        {slots.length < max && (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border border-dashed border-ink/20 text-center">
            <label className="cursor-pointer px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink">
              Загрузить
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <button type="button" onClick={() => setLibraryOpen(true)} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink">
              Из медиатеки
            </button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" name={`${name}_files`} multiple className="hidden" readOnly aria-hidden="true" />
      {slots.filter((s): s is Extract<Slot, { kind: 'existing' }> => s.kind === 'existing').map((s) => (
        <input key={`${s.bucket}:${s.path}`} type="hidden" name={`${name}_existing`} value={`${s.bucket}:${s.path}`} />
      ))}
      <input type="hidden" name={`${name}_order`} value={JSON.stringify(orderTokens)} />

      {libraryOpen && <MediaLibraryPicker onClose={() => setLibraryOpen(false)} onSelect={addFromLibrary} />}
    </div>
  );
}
