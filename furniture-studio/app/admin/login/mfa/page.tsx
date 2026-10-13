'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { verifyMfaLogin, type MfaCodeState } from '@/lib/actions/mfa';
import { logout } from '@/lib/actions/auth';
import { Input } from '@/components/ui/Input';

const initialState: MfaCodeState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60"
    >
      {pending ? 'Проверяем…' : 'Подтвердить'}
    </button>
  );
}

// Шаг 2 входа: пароль уже принят, нужен 6-значный код из приложения-аутентификатора.
// Доступ к странице контролирует middleware (только для состояния needs_mfa_code).
export default function MfaLoginPage() {
  const [state, formAction] = useFormState(verifyMfaLogin, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl">Код подтверждения</h1>
        <p className="mt-2 text-sm text-espresso">
          Откройте приложение-аутентификатор на телефоне и введите 6 цифр, которые оно показывает для этого сайта.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <Input
            name="code"
            label="Код из приложения"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
          />
          {state.status === 'error' && (
            <p role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
          <div className="mt-2">
            <SubmitButton />
          </div>
        </form>

        <form action={logout} className="mt-6">
          <button type="submit" className="text-sm text-espresso underline">
            Выйти и начать заново
          </button>
        </form>
      </div>
    </div>
  );
}
