'use client';

import { useTransition, useState } from 'react';
import { updateSectionMeta } from '@/lib/actions/home-sections';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormStatus } from '@/components/ui/FormStatus';

interface SimpleSectionEditorProps {
  sectionKey: string;
  label: string;
  titleLabel?: string;
  subtitleLabel?: string;
  title: string | null;
  subtitle: string | null;
  isVisible: boolean;
}

/** Универсальный редактор для секций, у которых есть только title/subtitle/is_visible. */
export function SimpleSectionEditor({
  sectionKey,
  label,
  titleLabel = 'Заголовок',
  subtitleLabel = 'Подзаголовок / текст',
  title,
  subtitle,
  isVisible,
}: SimpleSectionEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [titleValue, setTitleValue] = useState(title ?? '');
  const [subtitleValue, setSubtitleValue] = useState(subtitle ?? '');
  const [visible, setVisible] = useState(isVisible);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await updateSectionMeta(sectionKey, { title: titleValue, subtitle: subtitleValue, is_visible: visible });
      setResult(res);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded border border-stone/70 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">{label}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="h-4 w-4" />
          Показывать секцию
        </label>
      </div>
      <Input label={titleLabel} value={titleValue} onChange={(e) => setTitleValue(e.target.value)} />
      <Textarea label={subtitleLabel} rows={3} value={subtitleValue} onChange={(e) => setSubtitleValue(e.target.value)} />
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-ink px-6 py-2.5 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
        >
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {result && <FormStatus state={{ status: result.success ? 'success' : 'error', message: result.message }} />}
      </div>
    </form>
  );
}
