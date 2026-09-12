'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { listMediaAssets, deleteMediaAsset, getMediaAssetUsage, type MediaAsset } from '@/lib/actions/media';

interface MediaLibraryPickerProps {
  /** Ограничить показ одним бакетом (например, только 'site' для логотипа). Без значения — оба. */
  bucket?: 'works' | 'site';
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}

export function MediaLibraryPicker({ bucket, onSelect, onClose }: MediaLibraryPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<MediaAsset | null>(null);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();

  useEffect(() => {
    let cancelled = false;
    listMediaAssets().then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setAssets(res.assets);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [onClose]);

  const filtered = (assets ?? [])
    .filter((a) => !bucket || a.bucket === bucket)
    .filter((a) => !query.trim() || a.path.toLowerCase().includes(query.trim().toLowerCase()));

  function requestDelete(asset: MediaAsset) {
    setConfirmTarget(asset);
    setDeleteError(null);
    setUsageMessage(null);
    setCheckingUsage(true);
    getMediaAssetUsage(asset.bucket, asset.path).then((usage) => {
      setCheckingUsage(false);
      if (usage.used) setUsageMessage(`Используется: ${usage.locations.join(', ')}. Удаление отменено.`);
    });
  }

  function confirmDelete() {
    if (!confirmTarget) return;
    startTransition(async () => {
      const result = await deleteMediaAsset(confirmTarget.bucket, confirmTarget.path);
      if (!result.success) {
        setDeleteError(result.message);
        return;
      }
      setAssets((prev) => (prev ?? []).filter((a) => !(a.bucket === confirmTarget.bucket && a.path === confirmTarget.path)));
      setConfirmTarget(null);
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-ink/10 bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 p-5">
          <h2 id={titleId} className="text-lg text-ink">Медиатека</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-ink/50 hover:text-ink" aria-label="Закрыть">×</button>
        </div>

        <div className="border-b border-ink/10 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени файла…"
            className="h-11 w-full border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!error && assets === null && <p className="py-10 text-center text-sm text-ink/40">Загружаем…</p>}
          {!error && assets !== null && filtered.length === 0 && <p className="py-10 text-center text-sm text-ink/40">Ничего не найдено.</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((asset) => (
              <div key={`${asset.bucket}:${asset.path}`} className="group relative overflow-hidden border border-ink/10 bg-black">
                <button type="button" onClick={() => onSelect(asset)} className="block aspect-square w-full">
                  <img src={asset.url} alt={asset.path} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(asset)}
                  aria-label={`Удалить ${asset.path}`}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white/80 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100"
                >
                  ×
                </button>
                <p className="truncate border-t border-ink/10 bg-surface px-2 py-1.5 text-[10px] text-ink/50">{asset.path.split('/').pop()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !isPending) setConfirmTarget(null); }}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md border border-ink/10 bg-surface p-6 shadow-2xl">
            <h3 className="text-lg text-ink">Удалить изображение навсегда?</h3>
            <p className="mt-2 text-sm leading-6 text-ink/55">
              Файл «{confirmTarget.path.split('/').pop()}» будет полностью удалён из хранилища. Это необратимо.
            </p>
            {checkingUsage && <p className="mt-4 text-xs text-ink/40">Проверяем, используется ли файл на сайте…</p>}
            {usageMessage && <p role="alert" className="mt-4 border border-amber-300/25 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100">{usageMessage}</p>}
            {deleteError && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs leading-5 text-red-200">{deleteError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmTarget(null)} disabled={isPending} className="min-h-11 border border-ink/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-ink/55 hover:text-ink disabled:opacity-40">Отмена</button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending || checkingUsage || !!usageMessage}
                className="min-h-11 border border-red-300/20 bg-red-300/10 px-4 py-3 text-xs uppercase tracking-[0.12em] text-red-100 hover:bg-red-300/15 disabled:opacity-40"
              >
                {isPending ? 'Удаление…' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
