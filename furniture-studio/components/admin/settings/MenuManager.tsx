'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/actions/settings';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { FormStatus } from '@/components/ui/FormStatus';

type Item = { id: string; label: string; href: string; sort_order: number; is_visible: boolean };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="border border-ink/20 bg-ink px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas disabled:opacity-50">{pending ? 'Сохраняем…' : label}</button>;
}

function MenuFields({ item }: { item?: Item }) {
  return <>
    <label className="text-xs text-ink/60">Название пункта<input name="label" defaultValue={item?.label ?? ''} required placeholder="Проекты" className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40" /></label>
    <label className="text-xs text-ink/60">Адрес страницы<input name="href" defaultValue={item?.href ?? ''} required placeholder="/works" className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-ink/40" /></label>
    <label className="text-xs text-ink/60">Порядок<input name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3 text-sm text-ink outline-none focus:border-ink/40" /></label>
  </>;
}

function NewMenuItem() {
  const [state, formAction] = useFormState(createMenuItem, null);
  return <form action={formAction} className="border border-ink/10 bg-surface p-5 sm:p-6">
    <p className="eyebrow">добавить</p>
    <h3 className="mt-1 text-lg text-ink">Новый пункт меню</h3>
    <p className="mt-2 text-xs leading-5 text-ink/50">Пункты можно добавлять, скрывать, переименовывать и менять их порядок. Они автоматически используются в публичной шапке.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr,1fr,120px]"><MenuFields /></div>
    <label className="mt-4 flex items-center gap-2 text-xs text-ink/65"><input name="is_visible" type="checkbox" defaultChecked className="h-4 w-4" /> Показывать на сайте</label>
    <div className="mt-5 flex items-center gap-3"><Submit label="Добавить пункт" />{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
  </form>;
}

function MenuRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(updateMenuItem.bind(null, item.id), null);
  if (editing) return <form action={formAction} className="border border-ink/15 bg-canvas p-5 sm:p-6">
    <div className="grid gap-4 lg:grid-cols-[1fr,1fr,120px]"><MenuFields item={item} /></div>
    <label className="mt-4 flex items-center gap-2 text-xs text-ink/65"><input name="is_visible" type="checkbox" defaultChecked={item.is_visible} className="h-4 w-4" /> Показывать на сайте</label>
    <div className="mt-5 flex flex-wrap items-center gap-3"><Submit label="Сохранить изменения" /><button type="button" onClick={() => setEditing(false)} className="border border-ink/15 px-4 py-3 text-[10px] uppercase tracking-[0.12em] text-ink/70 hover:text-ink">Отмена</button>{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
  </form>;
  return <div className="flex flex-col gap-4 border border-ink/10 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div><p className="text-sm text-ink">{item.label} {!item.is_visible && <span className="ml-2 text-ink/40">— скрыт</span>}</p><p className="mt-1 text-xs text-ink/40">{item.href} · порядок {item.sort_order}</p></div>
    <div className="flex items-center gap-4"><button type="button" onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-[0.12em] text-ink/65 hover:text-ink">Изменить</button><ConfirmDialog triggerLabel="Удалить" title={`Удалить «${item.label}»?`} onConfirm={() => deleteMenuItem(item.id)} /></div>
  </div>;
}

export function MenuManager({ items }: { items: Item[] }) {
  return <div className="space-y-3"><NewMenuItem />{items.map((item) => <MenuRow key={item.id} item={item} />)}</div>;
}
