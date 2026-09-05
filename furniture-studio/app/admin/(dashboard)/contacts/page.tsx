import { createClient } from '@/lib/supabase/server';
import { RequestList } from '@/components/admin/contacts/RequestList';
import { EmptyState } from '@/components/admin/shared/EmptyState';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import type { ContactRequest } from '@/types/domain';

async function getRequests(): Promise<ContactRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('contact_requests').select('*').order('created_at', { ascending: false });
  if (error) { console.error('getRequests failed', error.message); return []; }
  return data ?? [];
}

export default async function AdminContactsPage() {
  const requests = await getRequests();
  return <div className="max-w-[1280px]"><PageHeader title="Заявки" description={`Всего: ${requests.length}`} />{requests.length === 0 ? <div className="mt-6"><EmptyState title="Новых заявок нет" description="Когда клиент отправит форму на сайте, заявка появится здесь." /></div> : <div className="mt-6"><RequestList requests={requests} /></div>}</div>;
}
