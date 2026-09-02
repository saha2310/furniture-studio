'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/actions/settings';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';

type Item = { id: string; label: string; href: string; sort_order: number; is_visible: boolean };
function Submit({ label }: { label: string }) { const { pending } = useFormStatus(); return <button disabled={pending} className="border border-white/20 bg-white px-4 py-2 text-xs text-black disabled:opacity-50">{pending ? 'Сохраняем…' : label}</button>; }
export function MenuManager({ items }: { items: Item[] }) {
  return <div className="space-y-3">
    <form action={createMenuItem} className="grid gap-3 border border-white/10 bg-[#1b1a18] p-4 sm:grid-cols-[1fr,1fr,100px,auto,auto] sm:items-end">
      <label className="text-xs text-espresso">Название<input name="label" required placeholder="Проекты" className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label>
      <label className="text-xs text-espresso">Адрес<input name="href" required placeholder="/works" className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label>
      <label className="text-xs text-espresso">Порядок<input name="sort_order" type="number" defaultValue="0" className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label>
      <label className="flex items-center gap-2 pb-2 text-xs text-espresso"><input name="is_visible" type="checkbox" defaultChecked /> Показывать</label><Submit label="Добавить" />
    </form>
    {items.map(item => <MenuRow key={item.id} item={item} />)}
  </div>
}
function MenuRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false); const [state, action] = useFormState(updateMenuItem.bind(null, item.id), null);
  if (editing) return <form action={action} className="grid gap-3 border border-white/10 p-4 sm:grid-cols-[1fr,1fr,100px,auto,auto] sm:items-end"><label className="text-xs text-espresso">Название<input name="label" defaultValue={item.label} required className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label><label className="text-xs text-espresso">Адрес<input name="href" defaultValue={item.href} required className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label><label className="text-xs text-espresso">Порядок<input name="sort_order" type="number" defaultValue={item.sort_order} className="mt-2 w-full border border-white/15 bg-transparent px-3 py-2 text-sm text-ink" /></label><label className="flex items-center gap-2 pb-2 text-xs text-espresso"><input name="is_visible" type="checkbox" defaultChecked={item.is_visible} /> Показывать</label><div className="flex gap-2"><Submit label="Сохранить" /><button type="button" onClick={() => setEditing(false)} className="border border-white/15 px-4 py-2 text-xs">Отмена</button></div>{state && <span className="text-xs text-espresso">{state.message}</span>}</form>;
  return <div className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#1b1a18] p-4"><div><p className="text-sm text-ink">{item.label} {!item.is_visible && <span className="text-stone">· скрыт</span>}</p><p className="mt-1 text-xs text-stone">{item.href} · порядок {item.sort_order}</p></div><div className="flex items-center gap-4"><button onClick={() => setEditing(true)} className="text-sm text-espresso hover:text-white">Изменить</button><ConfirmDialog triggerLabel="Удалить" title={`Удалить «${item.label}»?`} onConfirm={() => deleteMenuItem(item.id)} /></div></div>
}
