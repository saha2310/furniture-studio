'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateHeroSection } from '@/lib/actions/home-sections';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormStatus } from '@/components/ui/FormStatus';
import { SingleImageField } from '@/components/admin/shared/SingleImageField';
import type { HeroContent } from '@/types/domain';

function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="bg-white px-6 py-3 text-[10px] uppercase tracking-[0.12em] text-black disabled:opacity-50">{pending ? 'Сохраняем…' : 'Сохранить первый экран'}</button>; }

export function HeroEditor({ content, isVisible }: { content: HeroContent | null; isVisible: boolean }) {
  const [state, formAction] = useFormState(updateHeroSection, null);
  return <form action={formAction} className="border border-white/10 bg-[#171716] p-5 sm:p-6">
    <div className="flex items-center justify-between"><div><p className="eyebrow">главная</p><h2 className="mt-1 text-lg text-white">Первый экран</h2></div><label className="flex items-center gap-2 text-xs text-white/70"><input type="checkbox" name="is_visible" defaultChecked={isVisible} className="h-4 w-4" /> Показывать секцию</label></div>
    <div className="mt-5 grid gap-5"><Input name="title" label="Заголовок" defaultValue={content?.title ?? ''} required /><Textarea name="description" label="Описание" rows={3} defaultValue={content?.description ?? ''} required /></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><Input name="primaryCtaLabel" label="Основная кнопка" defaultValue={content?.primaryCtaLabel ?? 'Обсудить проект'} required /><Input name="primaryCtaHref" label="Ссылка основной кнопки" defaultValue={content?.primaryCtaHref ?? '/contacts'} required /><Input name="secondaryCtaLabel" label="Вторая кнопка" defaultValue={content?.secondaryCtaLabel ?? 'Посмотреть работы'} required /><Input name="secondaryCtaHref" label="Ссылка второй кнопки" defaultValue={content?.secondaryCtaHref ?? '/works'} required /></div>
    <div className="mt-5"><SingleImageField fieldName="image" existingPath={content?.imagePath} label="Фоновое изображение Hero" help="Изображение не сохраняется при выборе файла. Оно будет загружено только вместе с кнопкой «Сохранить первый экран»." cropRatio={16 / 9} /></div>
    <div className="mt-5 flex items-center gap-4"><SubmitButton />{state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}</div>
  </form>;
}
