import type { WorkWithUrls } from '@/types/domain';
import { WorkCard } from './WorkCard';

export function WorksGrid({ works }: { works: WorkWithUrls[] }) {
  if (works.length === 0) {
    return (
      <p className="py-16 text-center text-espresso">
        Пока нет опубликованных работ в этой категории.
      </p>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {works.map((work, i) => (
        <WorkCard key={work.id} work={work} priority={i < 3} />
      ))}
    </div>
  );
}
