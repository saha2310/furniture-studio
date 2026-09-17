import { Skeleton } from '@/components/ui/Skeleton';

// Держим в синхроне с app/(public)/works/page.tsx и WorksGrid: отступ под
// фиксированную шапку (pt-[82px], шапка position:absolute — без этого
// скелетон рисуется у самого верха и на миг прячется под ней) и число
// колонок сетки (сейчас карточки "journal" идут по 2 в ряд на lg, а не по 3 —
// раньше здесь остался скелетон от прежней, более компактной раскладки).
export default function WorksLoading() {
  return (
    <div className="pt-[82px]">
      <div className="container-studio border-b border-ink/10 pt-8 lg:pt-14 pb-10 lg:pb-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-96" />
        <div className="mt-10 flex gap-3">
          <Skeleton className="h-12 w-24 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
      <div className="container-studio grid gap-5 pt-6 pb-12 sm:gap-6 lg:grid-cols-2 lg:pt-8 lg:pb-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden border border-ink/10 sm:flex-row">
            <Skeleton className="aspect-[4/3] w-full sm:aspect-auto sm:h-auto sm:w-1/2" />
            <div className="flex-1 p-6 lg:p-7">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-6 w-48" />
              <Skeleton className="mt-3 h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
