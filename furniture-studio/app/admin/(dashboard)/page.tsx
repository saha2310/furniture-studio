import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/shared/PageHeader';

async function getCounts() {
  const supabase = await createClient();

  const [works, newRequests, categories] = await Promise.all([
    supabase.from('works').select('id', { count: 'exact', head: true }),
    supabase.from('contact_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
  ]);

  return {
    works: works.count ?? 0,
    newRequests: newRequests.count ?? 0,
    categories: categories.count ?? 0,
  };
}

export default async function AdminОбзорPage() {
  const counts = await getCounts();

  const cards = [
    { label: 'Работ опубликовано', value: counts.works, href: '/admin/works' },
    { label: 'Новых заявок', value: counts.newRequests, href: '/admin/contacts' },
    { label: 'Категорий', value: counts.categories, href: '/admin/categories' },
  ];

  return (
    <div>
      <PageHeader title="Обзор" description="Общая сводка по сайту" />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded border border-stone/70 p-6 hover:border-ink"
          >
            <p className="text-3xl font-display">{card.value}</p>
            <p className="mt-1 text-sm text-espresso">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/admin/works/new" className="rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso">
          Добавить работу
        </Link>
        <Link href="/" target="_blank" className="rounded border border-stone px-5 py-2.5 text-[15px] hover:border-ink">
          Открыть сайт
        </Link>
      </div>
    </div>
  );
}
