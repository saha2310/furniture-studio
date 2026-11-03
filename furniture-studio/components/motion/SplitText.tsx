/**
 * Текст, буквы которого появляются по очереди (CSS-анимация .letter-in в
 * app/globals.css). Работает и в серверных компонентах. Экранные чтецы
 * читают текст целиком (скрытая копия sr-only), а не по буквам.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  step = 38,
}: {
  text: string;
  className?: string;
  /** Задержка перед первой буквой, мс. */
  delay?: number;
  /** Шаг между буквами, мс. */
  step?: number;
}) {
  let index = 0;
  const words = text.split(/(\s+)/);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, wi) =>
        /^\s+$/.test(word) ? (
          <span key={wi} aria-hidden> </span>
        ) : (
          <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
            {Array.from(word).map((char, ci) => (
              <span key={ci} className="letter-in" style={{ animationDelay: `${delay + step * index++}ms` }}>
                {char}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
