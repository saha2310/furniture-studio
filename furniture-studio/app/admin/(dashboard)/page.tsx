import { PageHeader } from '@/components/admin/shared/PageHeader';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { DecorCatCard } from '@/components/admin/dashboard/DecorCatCard';
import { RecentWorksCard } from '@/components/admin/dashboard/RecentWorksCard';
import { CategoryBreakdownCard } from '@/components/admin/dashboard/CategoryBreakdownCard';
import { QuickActionsCard } from '@/components/admin/dashboard/QuickActionsCard';
import { getDashboardCounts, getRecentWorksAdmin, getCategoryWorkCounts } from '@/lib/queries/dashboard';

export default async function AdminOverviewPage() {
  const [counts, recentWorks, categoryCounts] = await Promise.all([
    getDashboardCounts(),
    getRecentWorksAdmin(5),
    getCategoryWorkCounts(),
  ]);

  return (
    <div>
      <PageHeader title="Обзор" description="Общая сводка по сайту" />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Работ опубликовано" value={counts.published} href="/admin/works" />
        <StatCard label="Категорий" value={counts.categories} href="/admin/categories" />
        <StatCard label="Черновиков" value={counts.drafts} href="/admin/works" />
        <DecorCatCard />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentWorksCard works={recentWorks} />
        <CategoryBreakdownCard categories={categoryCounts} />
      </div>

      <div className="mt-6">
        <QuickActionsCard />
      </div>
    </div>
  );
}
