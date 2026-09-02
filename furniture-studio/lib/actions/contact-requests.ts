'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import type { ActionResult } from './works';
import { actionError } from '@/lib/utils/action-error';
import type { ContactRequest } from '@/types/domain';

export async function updateContactRequestStatus(
  requestId: string,
  status: ContactRequest['status']
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_requests').update({ status }).eq('id', requestId);

  if (error) {
    console.error('updateContactRequestStatus failed', error.message);
    return { success: false, message: 'Не удалось обновить статус' };
  }

  revalidatePath('/admin/contacts');
  return { success: true, message: 'Статус обновлён' };
}

export async function deleteContactRequest(requestId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_requests').delete().eq('id', requestId);

  if (error) {
    console.error('deleteContactRequest failed', error.message);
    return { success: false, message: actionError('Не удалось удалить заявку.', error) };
  }

  revalidatePath('/admin/contacts');
  return { success: true, message: 'Заявка удалена' };
}
