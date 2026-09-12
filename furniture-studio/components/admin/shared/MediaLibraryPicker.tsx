'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { listMediaAssets, deleteMediaAsset, getMediaAssetUsage, type MediaAsset } from '@/lib/actions/media';

interface MediaLibraryPickerProps {
  /** Ограничить показ одним бакетом (например, только 'site' для логотипа). Без значения — оба. */
  bucket?: 'works' | 'site';
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}

const BUCKET_LABELS: Record<'all' | 'works' | 'site', string> = {
  all: 'Все',
  works: 'В работах',
  site: 'В настройках сайта',
};

export function MediaLibraryPicker({ bucket, onSelect, onClose }: MediaLibraryPickerProps) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Фильтр по бакету имеет смысл показывать только когда вызывающий код не
  // зафиксировал bucket сам (см. WorkImageEditor — там он всегда 'works').
  const [bucketFilter, setBucketFilter] = useState<'all' | 'works' | 'site'>('all');
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
    .filter((a) => bucket || bucketFilter === 'all' || a.bucket === bucketFilter)
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

        <div className="flex flex-col gap-3 border-b border-ink/10 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени файла…"
            className="h-11 w-full border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
          />
          {!bucket && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по расположению">
              {(Object.keys(BUCKET_LABELS) as Array<'all' | 'works' | 'site'>).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBucketFilter(key)}
                  className={`h-9 border px-3 text-[10px] uppercase tracking-[0.1em] transition-colors ${
                    bucketFilter === key
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink'
                  }`}
                >
                  {BUCKET_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!error && assets === null && <p className="py-10 text-center text-sm text-ink/40">Загружаем…</p>}
          {!error && assets !== null && filtered.length === 0 && <p className="py-10 text-center text-sm text-ink/40">Ничего не найдено.</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((asset) => (
              <div key={`${asset.bucket}:${asset.path}`} className="group relative overflow-hidden border border-ink/10 bg-black">
                <button type="button" onClick={() => onSelect(asset)} className="block aspect-square w-full">
                  <img
                    src={asset.thumbUrl}
                    alt={asset.path}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    // Если в проекте Supabase не включены (платные) Image
                    // Transformations, эндпоинт миниатюры вернёт ошибку —
                    // в этом случае тихо откатываемся на оригинал, чтобы
                    // картинка всё равно показалась.
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== asset.url) img.src = asset.url;
                    }}
                  />
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
