import { createClient } from '@/lib/supabase/server';
import { RequestRow } from '@/components/admin/contacts/RequestRow';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import type { ContactRequest } from '@/types/domain';

async function getRequests(): Promise<ContactRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getRequests failed', error.message);
    return [];
  }
  return data ?? [];
}

export default async function AdminContactsPage() {
  const requests = await getRequests();

  return (
    <div>
      <PageHeader title="Заявки" description={`Всего: ${requests.length}`} />

      <div className="mt-6">
        {requests.length === 0 ? (
          <EmptyState title="Заявок пока нет" description="Здесь появятся заявки с формы на странице «Контакты»." />
        ) : (
          <div className="overflow-hidden border border-white/10 bg-[#171716]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[34%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">Контакт</th>
                    <th className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">Запрос</th>
                    <th className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">Комментарий</th>
                    <th className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">Дата</th>
                    <th className="px-4 py-3 text-[10px] font-normal uppercase tracking-[0.14em]">Статус</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <RequestRow key={request.id} request={request} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
