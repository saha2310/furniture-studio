'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { FormStatus } from '@/components/ui/FormStatus';
import type { ImportMode, ImportSummary } from '@/lib/backup/types';
import type { JsonImportSummary } from '@/lib/backup/json-import';

type Status = { status: 'idle' | 'success' | 'error'; message?: string };

function summaryText(summary: ImportSummary): string {
  const parts = [`категорий: ${summary.categories}`, `товаров: ${summary.works}`, `фото: ${summary.images}`];
  if (summary.mode === 'replace') {
    parts.push(`способов связи: ${summary.contactLinks}`, `пунктов меню: ${summary.menuItems}`, `секций главной: ${summary.homeSections}`);
  }
  const modeLabel = summary.mode === 'replace' ? 'полная замена' : 'добавить как новые';
  let text = `Готово (режим «${modeLabel}»). ${parts.join(', ')}.`;
  if (summary.skippedImages.length > 0) {
    text += ` Не нашлось в архиве и было пропущено фото: ${summary.skippedImages.length} — товары и категории всё равно создались, просто без этих картинок.`;
  }
  return text;
}


function jsonSummaryText(summary: JsonImportSummary): string {
  const parts = [
    `категории: +${summary.categoriesCreated} / обновлено ${summary.categoriesUpdated}`,
    `работы: +${summary.worksCreated} / обновлено ${summary.worksUpdated}`,
  ];
  if (summary.contactLinksCreated || summary.contactLinksUpdated) parts.push(`связи: +${summary.contactLinksCreated} / обновлено ${summary.contactLinksUpdated}`);
  if (summary.menuItemsCreated || summary.menuItemsUpdated) parts.push(`меню: +${summary.menuItemsCreated} / обновлено ${summary.menuItemsUpdated}`);
  if (summary.homeSectionsCreated || summary.homeSectionsUpdated) parts.push(`секции: +${summary.homeSectionsCreated} / обновлено ${summary.homeSectionsUpdated}`);
  if (summary.settingsUpdated) parts.push('настройки: обновлены');
  return `Готово. ${parts.join(', ')}. Ничего не удалялось.`;
}

export function BackupPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ status: 'idle' });
  const [jsonStatus, setJsonStatus] = useState<Status>({ status: 'idle' });

  async function runImport(mode: ImportMode): Promise<{ success: boolean; message: string }> {
    if (!file) {
      return { success: false, message: 'Сначала выберите файл архива (.zip).' };
    }

    setBusy(true);
    setStatus({ status: 'idle' });
    try {
      // Архив грузится в Storage прямо из браузера, а не через тело нашей
      // серверной функции — см. lib/backup/README.md, почему это важно для
      // архивов с фото на Vercel.
      const supabase = createBrowserSupabaseClient();
      const storagePath = `restore/${Date.now()}-${crypto.randomUUID()}.zip`;

      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(storagePath, file, { contentType: 'application/zip' });
      if (uploadError) {
        const message = `Не удалось загрузить архив в хранилище: ${uploadError.message}`;
        setStatus({ status: 'error', message });
        return { success: false, message };
      }

      const response = await fetch('/admin/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, mode }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data?.error ?? 'Не удалось восстановить данные из архива.';
        setStatus({ status: 'error', message });
        return { success: false, message };
      }

      const message = summaryText(data.summary as ImportSummary);
      setStatus({ status: 'success', message });
      setFile(null);
      return { success: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось восстановить данные из архива.';
      setStatus({ status: 'error', message });
      return { success: false, message };
    } finally {
      setBusy(false);
    }
  }


  async function runJsonImport() {
    if (!jsonFile) {
      setJsonStatus({ status: 'error', message: 'Сначала выберите JSON-файл.' });
      return;
    }

    setBusy(true);
    setJsonStatus({ status: 'idle' });
    try {
      const supabase = createBrowserSupabaseClient();
      const storagePath = `restore-json/${Date.now()}-${crypto.randomUUID()}.json`;
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(storagePath, jsonFile, { contentType: 'application/json' });
      if (uploadError) {
        const message = `Не удалось загрузить JSON: ${uploadError.message}`;
        setJsonStatus({ status: 'error', message });
        return;
      }

      const response = await fetch('/admin/api/backup/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data?.error ?? 'Не удалось импортировать JSON.';
        setJsonStatus({ status: 'error', message });
        return;
      }

      setJsonStatus({ status: 'success', message: jsonSummaryText(data.summary as JsonImportSummary) });
      setJsonFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось импортировать JSON.';
      setJsonStatus({ status: 'error', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm leading-6 text-espresso">
          Один .zip со всеми категориями, товарами, фото и настройками сайта (логотип, меню, способы связи).
          Заявки клиентов в архив намеренно не входят.
        </p>
        <a
          href="/admin/api/backup/export"
          className="mt-4 inline-block rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso"
        >
          Скачать резервную копию
        </a>
      </div>

      <div className="border-t border-ink/10 pt-6">
        <p className="text-sm leading-6 text-espresso">Восстановление из ранее скачанного архива.</p>

        <input
          type="file"
          accept=".zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-4 block text-sm text-espresso file:mr-4 file:rounded file:border-0 file:bg-ink/10 file:px-4 file:py-2 file:text-sm file:text-ink file:hover:bg-ink/15"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => runImport('add')}
            className="rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
          >
            {busy ? 'Обрабатываем…' : 'Добавить как новые'}
          </button>

          <ConfirmDialog
            triggerLabel="Полностью заменить"
            title="Заменить весь каталог и настройки?"
            description="Текущие категории, товары, фото, меню и способы связи будут удалены и заменены содержимым архива. Действие необратимо — сделайте свежий бэкап текущего состояния перед этим, если не уверены."
            confirmLabel="Да, заменить всё"
            onConfirm={() => runImport('replace')}
            triggerClassName="min-h-11 rounded border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-[15px] text-red-100 hover:bg-red-300/15"
          />
        </div>

        <div className="mt-4">
          <FormStatus state={status} />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-6">
        <p className="text-sm font-medium text-ink">Быстрый импорт из JSON</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-espresso">
          Подходит для данных, которые подготовила нейросеть. Существующие записи обновляются, новые создаются,
          а всё, чего нет в JSON, остаётся без изменений. Никакие записи этим режимом не удаляются.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => setJsonFile(event.target.files?.[0] ?? null)}
          className="mt-4 block text-sm text-espresso file:mr-4 file:rounded file:border-0 file:bg-ink/10 file:px-4 file:py-2 file:text-sm file:text-ink file:hover:bg-ink/15"
        />
        <button
          type="button"
          disabled={busy || !jsonFile}
          onClick={runJsonImport}
          className="mt-4 rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
        >
          {busy ? 'Импортируем…' : 'Обновить из JSON'}
        </button>
        <a
          href="/admin/backup-import-example.json"
          download
          className="mt-3 inline-block text-sm text-espresso underline decoration-ink/20 underline-offset-4 hover:text-ink"
        >
          Скачать пример JSON
        </a>
        <div className="mt-4">
          <FormStatus state={jsonStatus} />
        </div>
        <details className="mt-5 rounded border border-ink/10 bg-ink/[0.03] p-4 text-sm text-espresso">
          <summary className="cursor-pointer font-medium text-ink">Какой JSON можно загрузить?</summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5">{`{
  "categories": [{ "slug": "kitchens", "name": "Кухни" }],
  "works": [{
    "slug": "modern-kitchen",
    "title": "Современная кухня",
    "category_slug": "kitchens",
    "description": "Новое описание",
    "price": "от 250 000 ₽",
    "specs": { "Материал": "Шпон" }
  }],
  "site_settings": {
    "phone": "+7 999 123-45-67",
    "email": "hello@example.ru"
  }
}`}</pre>
          <p className="mt-3 text-xs leading-5">
            Для существующей записи достаточно стабильного ключа: <b>slug</b> для категорий и работ, <b>key</b> для секций,
            <b>href</b> для меню, <b>platform</b> для способов связи. Поля, которых нет в JSON, не меняются.
          </p>
        </details>
      </div>
    </div>
  );
}
