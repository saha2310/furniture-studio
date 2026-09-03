'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { deleteWork } from '@/lib/actions/works';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import type { WorkWithUrls } from '@/types/domain';

const PREVIEW_LIMIT = 100;
const compact = (value: string, limit = PREVIEW_LIMIT) => value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;

export function WorkTable({ works }: { works: WorkWithUrls[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const categories = useMemo(() => Array.from(new Set(works.map((work) => work.category?.name).filter(Boolean))).sort(), [works]);
  const filtered = useMemo(() => works.filter((work) => {
    const text = `${work.title} ${work.slug} ${work.category?.name ?? ''}`.toLowerCase();
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    const matchesCategory = category === 'all' || work.category?.name === category;
    const matchesStatus = status === 'all' || work.status === status;
    return matchesQuery && matchesCategory && matchesStatus;
  }), [works, query, category, status]);

  return (
    <div className="space-y-4">
      <div className="border border-white/10 bg-[#171716] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),190px,160px]">
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Поиск
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название, URL или категория" className="h-11 border border-white/10 bg-[#111110] px-3 text-sm normal-case tracking-normal text-white placeholder:text-white/25 focus:border-white/30" />
          </label>
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Категория
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 border border-white/10 bg-[#111110] px-3 text-sm normal-case tracking-normal text-white">
              <option value="all">Все категории</option>
              {categories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 border border-white/10 bg-[#111110] px-3 text-sm normal-case tracking-normal text-white">
              <option value="all">Все</option><option value="published">Опубликовано</option><option value="draft">Черновик</option>
            </select>
          </label>
        </div>
        <div className="mt-3 text-xs text-white/40">Показано: {filtered.length} из {works.length}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-white/10 px-5 py-12 text-center text-sm text-white/45">По этим условиям работы не найдены.</div>
      ) : <>
        <div className="hidden overflow-hidden border border-white/10 bg-[#171716] lg:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup><col className="w-[38%]" /><col className="w-[18%]" /><col className="w-[15%]" /><col className="w-[12%]" /><col className="w-[17%]" /></colgroup>
            <thead className="border-b border-white/10 bg-white/[0.03] text-white/45">
              <tr>{['Работа', 'Категория', 'Статус', 'Главная', 'Действия'].map((label) => <th key={label} className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">{label}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((work) => <tr key={work.id} className="border-b border-white/10 last:border-0 hover:bg-white/[0.015]">
                <td className="px-4 py-4"><div className="flex min-w-0 items-center gap-3"><div className="h-14 w-20 shrink-0 overflow-hidden bg-[#25231f]">{work.coverImage?.url ? <img src={work.coverImage.url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0"><Link href={`/admin/works/${work.id}`} className="block truncate text-white hover:underline">{work.title}</Link><p className="mt-1 truncate text-xs text-white/40">{compact(work.description ?? '', 70)}</p></div></div></td>
                <td className="truncate px-4 py-4 text-white/60">{work.category?.name ?? '—'}</td>
                <td className="px-4 py-4"><Badge tone={work.status === 'published' ? 'default' : 'muted'}>{work.status === 'published' ? 'Опубликовано' : 'Черновик'}</Badge></td>
                <td className="px-4 py-4 text-white/55">{work.is_featured ? 'Да' : '—'}</td>
                <td className="px-4 py-4"><div className="flex items-center justify-end gap-4"><Link href={`/admin/works/${work.id}`} className="text-sm text-white/70 hover:text-white">Изменить</Link><Link href={`/works/${work.slug}`} target="_blank" className="text-sm text-white/40 hover:text-white">На сайт ↗</Link><ConfirmDialog triggerLabel="Удалить" title={`Удалить «${work.title}»?`} description="Фотографии этой работы также будут удалены. Это действие необратимо." onConfirm={() => deleteWork(work.id)} /></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 lg:hidden">
          {filtered.map((work) => <article key={work.id} className="border border-white/10 bg-[#171716] p-4">
            <div className="flex gap-4"><div className="h-24 w-28 shrink-0 overflow-hidden bg-[#25231f]">{work.coverImage?.url ? <img src={work.coverImage.url} alt="" className="h-full w-full object-cover" /> : null}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><Link href={`/admin/works/${work.id}`} className="min-w-0 text-base text-white">{work.title}</Link>{work.is_featured && <span className="shrink-0 text-[10px] text-white/45">★</span>}</div><p className="mt-1 text-xs text-white/45">{work.category?.name ?? 'Без категории'}</p><div className="mt-3"><Badge tone={work.status === 'published' ? 'default' : 'muted'}>{work.status === 'published' ? 'Опубликовано' : 'Черновик'}</Badge></div></div></div>
            <div className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-white/45">{compact(work.description ?? 'Описание не задано.', 100)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-4"><Link href={`/admin/works/${work.id}`} className="text-xs uppercase tracking-[0.12em] text-white/80">Изменить</Link><Link href={`/works/${work.slug}`} target="_blank" className="text-xs uppercase tracking-[0.12em] text-white/45">На сайт ↗</Link><ConfirmDialog triggerLabel="Удалить" title={`Удалить «${work.title}»?`} description="Это действие необратимо." onConfirm={() => deleteWork(work.id)} /></div>
          </article>)}
        </div>
      </>}
    </div>
  );
}
