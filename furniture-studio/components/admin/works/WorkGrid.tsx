'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { deleteWork } from '@/lib/actions/works';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { WorkStatusToggle } from './WorkStatusToggle';
import { WorkPreviewPopover } from './WorkPreviewPopover';
import type { WorkWithUrls } from '@/types/domain';

type SortKey = 'default' | 'newest' | 'oldest' | 'title-asc' | 'title-desc';

const SORTERS: Record<SortKey, (a: WorkWithUrls, b: WorkWithUrls) => number> = {
  default: (a, b) => a.sort_order - b.sort_order,
  newest: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  oldest: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  'title-asc': (a, b) => a.title.localeCompare(b.title, 'ru'),
  'title-desc': (a, b) => b.title.localeCompare(a.title, 'ru'),
};

function WorkCard({ work, groupSiblings }: { work: WorkWithUrls; groupSiblings: WorkWithUrls[] }) {
  // groupSiblings — все товары того же group_id (включая сам work), уже
  // посчитанные один раз для всего списка в WorkGrid. Раньше карточка
  // смотрела только на СВОИ color_name/color_hex — если открытая запись была
  // «базовой» (создана до того, как к ней добавили цвета через «+ Новый
  // цвет»), у неё эти поля пустые, и список молча показывал «нет цвета»,
  // хотя у товара уже есть несколько вариантов в группе. Теперь смотрим на
  // группу целиком: один товар в группе — как раньше (свой цвет или ничего),
  // больше одного — ряд кружков всех цветов группы + подпись «N цветов»,
  // даже если у самой этой записи имя цвета не заполнено.
  const isGrouped = groupSiblings.length > 1;

  return (
    <article className="flex flex-col border border-ink/10 bg-surface transition-colors hover:border-ink/25">
      <Link href={`/admin/works/${work.id}`} className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-canvas">
        {work.coverImage?.url ? (
          <Image
            src={work.coverImage.url}
            alt=""
            fill
            quality={50}
            sizes="(min-width: 1280px) 23vw, (min-width: 1024px) 31vw, (min-width: 640px) 47vw, 92vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.12em] text-ink/25">Нет фото</div>
        )}
        {work.is_featured && (
          <span className="absolute left-2 top-2 bg-ink/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-canvas">Главная</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/admin/works/${work.id}`} className="min-w-0 truncate text-[15px] leading-tight text-ink hover:underline">
            {work.title}
          </Link>
          <WorkStatusToggle workId={work.id} workTitle={work.title} status={work.status} />
        </div>

        <p className="truncate text-xs text-ink/45">{work.category?.name ?? 'Без категории'}</p>

        {isGrouped ? (
          <div className="flex items-center gap-1.5 text-xs text-ink/55">
            <div className="flex -space-x-1">
              {groupSiblings.slice(0, 5).map((sibling) => (
                <span
                  key={sibling.id}
                  title={sibling.color_name ?? undefined}
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-surface ring-1 ring-ink/15"
                  style={{ backgroundColor: sibling.color_hex ?? '#8a7b6c' }}
                />
              ))}
            </div>
            <span className="truncate">{groupSiblings.length} цвет{groupSiblings.length >= 5 ? 'ов' : groupSiblings.length >= 2 ? 'а' : ''}</span>
          </div>
        ) : (
          (work.color_name || work.color_hex) && (
            <div className="flex items-center gap-1.5 text-xs text-ink/55">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/20" style={{ backgroundColor: work.color_hex ?? 'transparent' }} />
              <span className="truncate">{work.color_name || work.color_hex}</span>
            </div>
          )
        )}

        <WorkPreviewPopover work={work} />

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
          <span className="truncate text-sm text-ink">{work.price?.trim() || 'Договорная'}</span>
          <div className="flex shrink-0 items-center gap-3">
            <Link href={`/admin/works/${work.id}`} className="text-xs uppercase tracking-[0.12em] text-ink/70 hover:text-ink">
              Изменить
            </Link>
            <ConfirmDialog
              triggerLabel="Удалить"
              title={`Удалить «${work.title}»?`}
              description="Фотографии этой работы также будут удалены. Это действие необратимо."
              onConfirm={() => deleteWork(work.id)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function WorkGrid({ works }: { works: WorkWithUrls[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<SortKey>('default');

  const categories = useMemo(() => Array.from(new Set(works.map((work) => work.category?.name).filter(Boolean))).sort(), [works]);

  // Группируем весь (нефильтрованный) список по group_id один раз — так
  // счётчик «N цветов» на карточке не меняется в зависимости от текущего
  // поиска/фильтра, и не нужен отдельный запрос: список товаров и так уже
  // загружен на страницу целиком.
  const groupsById = useMemo(() => {
    const map = new Map<string, WorkWithUrls[]>();
    for (const work of works) {
      const key = work.group_id ?? work.id;
      const list = map.get(key) ?? [];
      list.push(work);
      map.set(key, list);
    }
    return map;
  }, [works]);

  const filtered = useMemo(() => {
    const list = works.filter((work) => {
      const text = `${work.title} ${work.slug} ${work.category?.name ?? ''}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesCategory = category === 'all' || work.category?.name === category;
      const matchesStatus = status === 'all' || work.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
    return list.slice().sort(SORTERS[sort]);
  }, [works, query, category, status, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border border-ink/10 bg-surface p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: название, URL, категория"
          className="h-9 min-w-[180px] flex-1 border border-ink/10 bg-canvas px-3 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 border border-ink/10 bg-canvas px-2 text-sm text-ink">
          <option value="all">Все категории</option>
          {categories.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 border border-ink/10 bg-canvas px-2 text-sm text-ink">
          <option value="all">Все статусы</option>
          <option value="published">Опубликовано</option>
          <option value="draft">Скрыто</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 border border-ink/10 bg-canvas px-2 text-sm text-ink">
          <option value="default">По порядку</option>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="title-asc">Название А→Я</option>
          <option value="title-desc">Название Я→А</option>
        </select>
        <span className="ml-auto whitespace-nowrap text-xs text-ink/35">{filtered.length} из {works.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-ink/10 px-5 py-12 text-center text-sm text-ink/45">По этим условиям работы не найдены.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((work) => (
            <WorkCard key={work.id} work={work} groupSiblings={groupsById.get(work.group_id ?? work.id) ?? [work]} />
          ))}
        </div>
      )}
    </div>
  );
}
