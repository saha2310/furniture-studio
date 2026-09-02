'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitContactRequest, type ContactActionState } from '@/lib/actions/contact';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormStatus } from '@/components/ui/FormStatus';

const initialState: ContactActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex w-full items-center justify-between border border-white/25 bg-transparent px-5 py-4 text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-60"
    >
      <><span>{pending ? 'Отправляем…' : 'Отправить заявку'}</span><span className="text-lg transition-transform duration-300 group-hover:translate-x-1">→</span></>
    </button>
  );
}

export function ContactForm({ sourcePage = 'contacts' }: { sourcePage?: string }) {
  const [state, formAction] = useFormState(submitContactRequest, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="source_page" value={sourcePage} />

      {/* Honeypot — скрыт от людей визуально и из порядка табуляции, боты часто его всё равно заполняют */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Оставьте это поле пустым</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Input
        name="name"
        label="Имя"
        placeholder="Как к вам обращаться"
        required
        error={state.fieldErrors?.name}
      />
      <Input
        name="contact"
        label="Телефон или мессенджер"
        placeholder="+7 900 000-00-00 или @username"
        required
        error={state.fieldErrors?.contact}
      />
      <Select name="request_type" label="Что хотите заказать?" defaultValue="">
        <option value="" disabled>
          Выберите вариант
        </option>
        <option value="Диван">Диван</option>
        <option value="Кресло">Кресло</option>
        <option value="Другое">Другое / затрудняюсь ответить</option>
      </Select>
      <Textarea
        name="comment"
        label="Комментарий"
        placeholder="Расскажите о пространстве и задаче — это поможет нам подготовиться к разговору"
        rows={4}
        error={state.fieldErrors?.comment}
      />

      <div className="flex flex-col items-start gap-4">
        <SubmitButton />
        <FormStatus state={state} />
      </div>
    </form>
  );
}
