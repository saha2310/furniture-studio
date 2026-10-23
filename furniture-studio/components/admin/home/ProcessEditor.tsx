'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateProcessSection } from '@/lib/actions/home-sections';
import { FormStatus } from '@/components/ui/FormStatus';
import type { ProcessContent, ProcessStep } from '@/types/domain';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Сохраняем…' : 'Сохранить шаги'}
    </button>
  );
}

export function ProcessEditor({ content, isVisible }: { content: ProcessContent | null; isVisible: boolean }) {
  const [state, formAction] = useFormState(updateProcessSection, null);
  const [steps, setSteps] = useState<ProcessStep[]>(
    content?.steps?.length ? content.steps : [{ title: '', description: '' }]
  );

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded border border-stone/70 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Как создаётся диван (шаги)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_visible" defaultChecked={isVisible} className="h-4 w-4" />
          Показывать секцию
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-2 rounded border border-stone/50 p-3 sm:flex-row sm:items-start">
            <input
              name="step_title"
              placeholder="Название шага"
              value={step.title}
              onChange={(e) => {
                const next = [...steps];
                next[i] = { ...next[i], title: e.target.value };
                setSteps(next);
              }}
              className="w-full rounded border border-stone bg-canvas px-3 py-2 text-sm sm:w-1/3"
            />
            <input
              name="step_description"
              placeholder="Описание шага"
              value={step.description}
              onChange={(e) => {
                const next = [...steps];
                next[i] = { ...next[i], description: e.target.value };
                setSteps(next);
              }}
              className="w-full flex-1 rounded border border-stone bg-canvas px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
              className="self-start px-2 text-sm text-stone hover:text-red-700"
              aria-label="Удалить шаг"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSteps([...steps, { title: '', description: '' }])}
          className="self-start text-sm text-walnut hover:text-walnutDark"
        >
          Добавить шаг
        </button>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        {state && <FormStatus state={{ status: state.success ? 'success' : 'error', message: state.message }} />}
      </div>
    </form>
  );
}
