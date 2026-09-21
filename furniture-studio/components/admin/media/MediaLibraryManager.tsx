'use client';

import { useEffect, useMemo, useState } from 'react';
import { listMediaAssetsWithUsage, deleteMediaAsset, type MediaAssetWithUsage } from '@/lib/actions/media';
import { formatBytes } from '@/lib/utils/format';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';

type BucketFilter = 'all' | 'works' | 'site';
type UsageFilter = 'unused' | 'all';

function assetKey(asset: { bucket: string; path: string }) {
  return `${asset.bucket}:${asset.path}`;
}

export function MediaLibraryManager() {
  const [assets, setAssets] = useState<MediaAssetWithUsage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  // По умолчанию показываем только неиспользуемые — это и есть та задача,
  // ради которой открывают эту страницу; «Все» — режим для проверки/поиска
  // конкретного файла.
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('unused');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);

  function load() {
    setError(null);
    listMediaAssetsWithUsage().then((res) => {
      if (res.error) setError(res.error);
      else setAssets(res.assets);
    });
  }

  useEffect(load, []);

  const totals = useMemo(() => {
    const all = assets ?? [];
    const unused = all.filter((a) => !a.used);
    return {
      count: all.length,
      size: all.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0),
      unusedCount: unused.length,
      unusedSize: unused.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0),
    };
  }, [assets]);

  const filtered = (assets ?? [])
    .filter((a) => bucketFilter === 'all' || a.bucket === bucketFilter)
    .filter((a) => usageFilter === 'all' || !a.used)
    .filter((a) => !query.trim() || a.path.toLowerCase().includes(query.trim().toLowerCase()));

  const selectedAssets = (assets ?? []).filter((a) => selected.has(assetKey(a)));
  const selectedSize = selectedAssets.reduce((sum, a) => sum + (a.sizeBytes ?? 0), 0);

  function toggleSelect(asset: MediaAssetWithUsage) {
    if (asset.used) return;
    const key = assetKey(asset);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((a) => { if (!a.used) next.add(assetKey(a)); });
      return next;
    });
  }

  function removeFromState(removed: { bucket: string; path: string }[]) {
    const removedKeys = new Set(removed.map(assetKey));
    setAssets((prev) => (prev ?? []).filter((a) => !removedKeys.has(assetKey(a))));
    setSelected((prev) => {
      const next = new Set(prev);
      removedKeys.forEach((key) => next.delete(key));
      return next;
    });
  }

  async function deleteBulk(): Promise<{ success: boolean; message: string }> {
    setBulkError(null);
    const targets = selectedAssets;
    const removed: { bucket: string; path: string }[] = [];
    const failed: string[] = [];

    // Последовательно, а не Promise.all — это фоновая уборка, а не
    // пользовательский сценарий с ожиданием: не нужно бить по Storage/БД
    // десятками параллельных запросов разом.
    for (const asset of targets) {
      // eslint-disable-next-line no-await-in-loop
      const result = await deleteMediaAsset(asset.bucket, asset.path);
      if (result.success) removed.push(asset);
      else failed.push(`${asset.path.split('/').pop()}: ${result.message}`);
    }

    removeFromState(removed);

    if (failed.length > 0) {
      const message = `Удалено ${removed.length} из ${targets.length}. Не удалось: ${failed.join('; ')}`;
      setBulkError(message);
      return { success: false, message };
    }
    return { success: true, message: `Удалено файлов: ${removed.length}` };
  }

  return (
    <div>
      <p className="max-w-[70ch] text-xs leading-5 text-ink/60">
        Фото загружаются в хранилище сразу при выборе файла в формах — ещё до нажатия «Сохранить». Если форму не
        сохранили (закрыли вкладку, ушли со страницы), уже загруженный файл остаётся здесь ничем не привязанным.
        Это нормально и безопасно — такие файлы ниже помечены как неиспользуемые, их можно спокойно удалить.
      </p>

      {error && <p role="alert" className="mt-4 border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p>}

      {!error && assets === null && <p className="mt-6 text-sm text-ink/40">Считаем файлы…</p>}

      {!error && assets !== null && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border border-ink/10 bg-canvas px-4 py-3 text-xs text-ink/60">
            <span>Всего файлов: <strong className="text-ink">{totals.count}</strong> · {formatBytes(totals.size)}</span>
            <span>Неиспользуемых: <strong className={totals.unusedCount > 0 ? 'text-danger' : 'text-ink'}>{totals.unusedCount}</strong> · {formatBytes(totals.unusedSize)}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени файла…"
              className="h-11 min-w-0 flex-1 border border-ink/15 bg-transparent px-3 text-sm text-ink placeholder:text-ink/35 focus:border-ink/40"
            />
            <select value={bucketFilter} onChange={(e) => setBucketFilter(e.target.value as BucketFilter)} className="h-11 border border-ink/15 bg-transparent px-3 text-sm text-ink focus:border-ink/40">
              <option value="all">Все бакеты</option>
              <option value="works">Фото работ</option>
              <option value="site">Сайт (лого, favicon…)</option>
            </select>
            <div className="flex h-11 shrink-0 border border-ink/15 text-xs uppercase tracking-[0.1em]">
              <button type="button" onClick={() => setUsageFilter('unused')} className={`px-3 ${usageFilter === 'unused' ? 'bg-ink text-canvas' : 'text-ink/60 hover:text-ink'}`}>Неиспользуемые</button>
              <button type="button" onClick={() => setUsageFilter('all')} className={`border-l border-ink/15 px-3 ${usageFilter === 'all' ? 'bg-ink text-canvas' : 'text-ink/60 hover:text-ink'}`}>Все</button>
            </div>
          </div>

          {usageFilter === 'unused' && filtered.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink/50">
              <button type="button" onClick={selectAllVisible} className="uppercase tracking-[0.1em] text-ink/60 hover:text-ink">Выбрать все показанные ({filtered.length})</button>
              {selected.size > 0 && <button type="button" onClick={() => setSelected(new Set())} className="uppercase tracking-[0.1em] text-ink/60 hover:text-ink">Снять выбор</button>}
            </div>
          )}

          {selected.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-ink/[0.03] px-4 py-3">
              <span className="text-xs text-ink/70">Выбрано: <strong className="text-ink">{selected.size}</strong> · {formatBytes(selectedSize)}</span>
              <ConfirmDialog
                triggerLabel={`Удалить выбранные (${selected.size})`}
                title="Удалить выбранные файлы навсегда?"
                description={`${selected.size} файлов (${formatBytes(selectedSize)}) будут полностью удалены из хранилища. Это необратимо. Перед удалением каждый файл ещё раз проверяется на использование на сайте.`}
                confirmLabel="Удалить навсегда"
                onConfirm={deleteBulk}
                triggerClassName="min-h-11 border border-danger/20 bg-danger/10 px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-danger hover:bg-danger/15"
              />
            </div>
          )}

          {bulkError && <p role="alert" className="mt-3 border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">{bulkError}</p>}

          {filtered.length === 0 && (
            <p className="mt-8 py-10 text-center text-sm text-ink/40">
              {usageFilter === 'unused' ? 'Неиспользуемых файлов не найдено — медиатека чистая.' : 'Ничего не найдено.'}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((asset) => {
              const key = assetKey(asset);
              const isSelected = selected.has(key);
              return (
                <div key={key} className={`group relative overflow-hidden border bg-black ${isSelected ? 'border-ink' : 'border-ink/10'}`}>
                  <button type="button" onClick={() => toggleSelect(asset)} disabled={asset.used} className="block aspect-square w-full disabled:cursor-not-allowed">
                    <img src={asset.url} alt={asset.path} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                  {!asset.used && (
                    <label className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(asset)} className="h-4 w-4 accent-white" aria-label={`Выбрать ${asset.path}`} />
                    </label>
                  )}
                  <span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] ${asset.used ? 'bg-black/60 text-white/80' : 'bg-danger/80 text-white'}`}>
                    {asset.used ? 'Используется' : 'Не используется'}
                  </span>
                  <div className="border-t border-ink/10 bg-surface px-2 py-1.5">
                    <p className="truncate text-[10px] text-ink/50">{asset.path.split('/').pop()}</p>
                    <p className="mt-0.5 text-[9px] text-ink/35">{formatBytes(asset.sizeBytes)}</p>
                  </div>
                  {!asset.used && (
                    <div className="absolute bottom-full right-1.5 mb-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <ConfirmDialog
                        triggerLabel="Удалить"
                        title="Удалить изображение навсегда?"
                        description={`Файл «${asset.path.split('/').pop()}» будет полностью удалён из хранилища. Это необратимо.`}
                        confirmLabel="Удалить навсегда"
                        onConfirm={() => deleteMediaAsset(asset.bucket, asset.path).then((r) => { if (r.success) removeFromState([asset]); return r; })}
                        triggerClassName="flex h-7 items-center justify-center rounded-full bg-black/70 px-3 text-[9px] uppercase tracking-[0.08em] text-white/85 hover:text-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
