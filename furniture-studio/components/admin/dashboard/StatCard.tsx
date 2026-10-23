import Link from 'next/link';

// Верхняя плашка с цифрой. href опционален — четвёртая (декоративная)
// плашка с котом контент передаёт сама и никуда не ведёт.
export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-3xl font-display text-ink">{value}</p>
      <p className="mt-1 text-sm text-espresso">{label}</p>
    </>
  );

  if (!href) {
    return <div className="border border-ink/10 bg-surface p-6">{content}</div>;
  }

  return (
    <Link href={href} className="block border border-ink/10 bg-surface p-6 transition-colors hover:border-ink/25">
      {content}
    </Link>
  );
}
