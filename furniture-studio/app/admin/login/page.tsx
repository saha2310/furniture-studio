'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from '@/lib/actions/auth';
import { Input } from '@/components/ui/Input';

const initialState: LoginState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Входим…' : 'Войти'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl">Вход в админку</h1>
        <p className="mt-2 text-sm text-espresso">Доступ только для администратора мастерской.</p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <Input name="email" type="email" label="Email" required autoComplete="username" />
          <Input name="password" type="password" label="Пароль" required autoComplete="current-password" />
          {state.status === 'error' && (
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
          <div className="mt-2">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
