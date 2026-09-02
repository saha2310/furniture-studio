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
          <div className="overflow-x-auto rounded border border-stone/70">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone/70 bg-surface text-espresso">
                <tr>
                  <th className="px-4 py-3 font-normal">Контакт</th>
                  <th className="px-4 py-3 font-normal">Запрос</th>
                  <th className="px-4 py-3 font-normal">Комментарий</th>
                  <th className="px-4 py-3 font-normal">Дата</th>
                  <th className="px-4 py-3 font-normal">Статус</th>
                  <th className="px-4 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
