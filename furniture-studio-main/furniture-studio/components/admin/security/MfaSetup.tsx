'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  confirmMfaEnrollment,
  startMfaEnrollment,
  type MfaCodeState,
  type MfaEnrollStart,
} from '@/lib/actions/mfa';
import { Input } from '@/components/ui/Input';

type Enrollment = Extract<MfaEnrollStart, { ok: true }>;

const initialState: MfaCodeState = { status: 'idle' };

const buttonClass =
  'inline-flex w-full items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso disabled:opacity-60';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? 'Проверяем…' : 'Подтвердить и войти'}
    </button>
  );
}

// Supabase отдаёт QR либо готовым data-URI, либо «голым» SVG — поддерживаем оба.
// Разрешено CSP: img-src содержит data: (см. next.config.mjs).
function toImageSrc(qrCode: string): string {
  return qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

export function MfaSetup() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, formAction] = useFormState(confirmMfaEnrollment, initialState);

  async function handleStart() {
    setLoading(true);
    setStartError(null);
    try {
      const result = await startMfaEnrollment();
      if (result.ok) {
        setEnrollment(result);
      } else {
        setStartError(result.message);
      }
    } catch {
      setStartError('Не удалось связаться с сервером. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  if (!enrollment) {
    return (
      <div className="mt-6">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-espresso">
          <li>Установите на телефон приложение-аутентификатор: Google Authenticator, Microsoft Authenticator или Яндекс Ключ.</li>
          <li>Нажмите кнопку ниже — появится QR-код.</li>
          <li>В приложении нажмите «+» и наведите камеру на QR-код.</li>
          <li>Введите 6 цифр, которые покажет приложение.</li>
        </ol>
        {startError && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {startError}
          </p>
        )}
        <div className="mt-6">
          <button type="button" onClick={handleStart} disabled={loading} className={buttonClass}>
            {loading ? 'Создаём ключ…' : 'Показать QR-код'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-espresso">
        Наведите камеру приложения на QR-код. Не делайте скриншот и не пересылайте его: по нему можно создавать такие же коды.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={toImageSrc(enrollment.qrCode)}
        alt="QR-код для приложения-аутентификатора"
        width={208}
        height={208}
        className="mt-4 bg-white p-2"
      />
      <p className="mt-4 break-all text-xs text-espresso">
        Не получается отсканировать? Введите ключ в приложении вручную: <span className="font-mono">{enrollment.secret}</span>
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="factorId" value={enrollment.factorId} />
        <Input
          name="code"
          label="Код из приложения"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
        />
        {state.status === 'error' && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        <ConfirmButton />
      </form>
    </div>
  );
}
