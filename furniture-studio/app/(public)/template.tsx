/**
 * template.tsx (в отличие от layout.tsx) создаётся заново при каждом переходе
 * между страницами — поэтому на нём удобно сделать мягкое проявление новой
 * страницы. Анимируется только прозрачность: transform на обёртке сломал бы
 * position: fixed у окон и панелей внутри страниц.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
