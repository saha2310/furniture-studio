'use client';

// Срабатывает, если сломался сам корневой layout — тогда обычный error.tsx
// не показывается. Должен сам отрисовать <html> и <body>.
import './globals.css';
import { useEffect } from 'react';
import { ErrorScene } from '@/components/errors/ErrorScene';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
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
      </body>
    </html>
  );
}
