import { Skeleton } from '@/components/ui/Skeleton';

export default function WorksLoading() {
  return (
    <div className="container-studio py-14">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-5 w-96" />
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="mt-3 h-5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
