'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { convertToWebp } from '@/lib/utils/image-client';
import { listNonWebpAssets, applyWebpMigration, type MigrationCandidate } from '@/lib/actions/media-migration';

type ItemStatus = 'pending' | 'converting' | 'done' | 'error';
interface Item extends MigrationCandidate {
  status: ItemStatus;
  errorMessage?: string;
}

function webpSiblingPath(oldPath: string): string {
  const withoutExt = oldPath.replace(/\.[^./]+$/, '');
  return `${withoutExt}-webp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.webp`;
}

/**
 * Разовый инструмент миграции: находит уже загруженные PNG/JPEG/GIF/AVIF
 * (кроме логотипа — см. lib/actions/media-migration.ts) и переводит их в
 * WebP тем же способом, каким сайт теперь конвертирует любую новую загрузку.
 * Ничего не делает сама — только показывает список и по кнопке запускает
 * перекодирование каждого файла в браузере администратора.
 */
export function WebpMigrationPanel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function scan() {
    setScanning(true);
    setScanError(null);
    try {
      const result = await listNonWebpAssets();
      if (result.error) { setScanError(result.error); return; }
      setItems(result.candidates.map((c) => ({ ...c, status: 'pending' })));
    } finally {
      setScanning(false);
    }
  }

  async function migrateOne(item: Item, supabase: ReturnType<typeof createBrowserSupabaseClient>) {
    setItems((prev) => prev?.map((i) => (i === item ? { ...i, status: 'converting', errorMessage: undefined } : i)) ?? prev);
    try {
      const response = await fetch(item.url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Не удалось скачать исходный файл');
      const blob = await response.blob();
      const sourceFile = new File([blob], item.path.split('/').pop() || 'image', { type: blob.type || 'image/png' });

      // Форсируем конвертацию: файл заведомо не WebP (иначе бы не попал в
      // список кандидатов), поэтому convertToWebp всегда перекодирует его.
      const webpFile = await convertToWebp(sourceFile);
      const newPath = webpSiblingPath(item.path);

      const { error: uploadError } = await supabase.storage.from(item.bucket).upload(newPath, webpFile, {
        contentType: 'image/webp',
        cacheControl: '31536000',
      });
      if (uploadError) throw new Error(uploadError.message);

      const result = await applyWebpMigration(item.kind, item.refId, item.path, newPath, item.bucket);
      if (!result.success) throw new Error(result.message);

      setItems((prev) => prev?.map((i) => (i === item ? { ...i, status: 'done' } : i)) ?? prev);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Не удалось перевести файл в WebP';
      setItems((prev) => prev?.map((i) => (i === item ? { ...i, status: 'error', errorMessage: message } : i)) ?? prev);
    }
  }

  async function runAll() {
    if (!items) return;
    setRunning(true);
    try {
      const supabase = createBrowserSupabaseClient();
      // Последовательно, не параллельно: это разовая фоновая задача админа,
      // не пользовательская загрузка — не нужно спешить ценой десятков
      // параллельных запросов к Storage и риска упереться в rate limit.
      for (const item of items) {
        if (item.status === 'done') continue;
        // eslint-disable-next-line no-await-in-loop
        await migrateOne(item, supabase);
      }
    } finally {
      setRunning(false);
    }
  }

  const pendingCount = items?.filter((i) => i.status !== 'done').length ?? 0;

  return (
    <div className="border border-ink/10 bg-surface p-5 sm:p-6">
      <p className="max-w-[70ch] text-xs leading-5 text-ink/60">
        Ищет уже загруженные фотографии и картинки сайта, которые ещё не в WebP (логотип сюда не входит — его при
        желании обновите отдельно, вручную). Перекодирование идёт в этом браузере, по одному файлу, и не трогает
        файлы, у которых уже всё в порядке.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={scan}
          disabled={scanning || running}
          className="border border-ink/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-ink/75 hover:border-ink/40 hover:text-ink disabled:opacity-50"
        >
          {scanning ? 'Ищем…' : 'Найти файлы не в WebP'}
        </button>
        {items && items.length > 0 && (
          <button
            type="button"
            onClick={runAll}
            disabled={running || pendingCount === 0}
            className="border border-ink/20 bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas hover:bg-ink/90 disabled:opacity-50"
          >
            {running ? 'Переводим…' : `Перевести в WebP (${pendingCount})`}
          </button>
        )}
      </div>

      {scanError && <p role="alert" className="mt-4 border border-red-300/20 bg-red-300/5 px-3 py-2 text-xs text-red-200">{scanError}</p>}

      {items && items.length === 0 && !scanError && (
        <p className="mt-4 text-xs text-ink/55">Всё уже в WebP — переносить нечего.</p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-5 divide-y divide-ink/10 border border-ink/10">
          {items.map((item) => (
            <li key={`${item.kind}:${item.refId}:${item.path}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
              <div className="min-w-0">
                <p className="truncate text-ink/85">{item.label}</p>
                {item.errorMessage && <p className="mt-0.5 text-[11px] text-red-300">{item.errorMessage}</p>}
              </div>
              <span
                className={
                  item.status === 'done'
                    ? 'shrink-0 text-[10px] uppercase tracking-[0.1em] text-emerald-400/90'
                    : item.status === 'error'
                    ? 'shrink-0 text-[10px] uppercase tracking-[0.1em] text-red-300'
                    : item.status === 'converting'
                    ? 'shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink/60'
                    : 'shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink/35'
                }
              >
                {item.status === 'done' ? 'Готово' : item.status === 'error' ? 'Ошибка' : item.status === 'converting' ? 'Переводим…' : 'В очереди'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
