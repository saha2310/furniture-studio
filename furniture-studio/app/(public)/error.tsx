'use client';

import { useEffect } from 'react';
import { ErrorScene } from '@/components/errors/ErrorScene';

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
    <ErrorScene
      side="site"
      code="500"
      title="У нас что-то сломалось"
      text="Это не ваша ошибка — сбой на стороне сайта. Мы уже чиним. Попробуйте обновить страницу через минуту."
      action={
        <button type="button" onClick={reset} className="error-scene-button">
          Попробовать снова
        </button>
      }
    />
  );
}
