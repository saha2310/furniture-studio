'use client';

import { useEffect } from 'react';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Public route error:', error);
  }, [error]);

  return (
    <div className="container-studio flex flex-col items-start py-24">
      <h1 className="text-2xl">Не получилось загрузить страницу</h1>
      <p className="mt-3 max-w-prose text-espresso">
        Возможно, временные проблемы с сервером. Попробуйте обновить страницу через минуту.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso"
      >
        Попробовать снова
      </button>
    </div>
  );
}
