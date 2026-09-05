import type { WorkWithUrls } from '@/types/domain';
import { WorkCard } from './WorkCard';

export function WorksGrid({ works }: { works: WorkWithUrls[] }) {
  if (works.length === 0) {
    return <p className="border-y border-ink/10 py-24 text-center text-sm text-stone">Пока нет опубликованных работ в этой категории.</p>;
  }

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {works.map((work, i) => (
        <WorkCard key={work.id} work={work} priority={i < 4} />
      ))}
    </div>
  );
}
