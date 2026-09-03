'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { workSchema } from '@/lib/validations/work.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';
import { actionError } from '@/lib/utils/action-error';

export interface ActionResult {
  success: boolean;
  message: string;
  id?: string;
}

function specsFromFormData(formData: FormData): Record<string, string> {
  const keys = formData.getAll('spec_key');
  const values = formData.getAll('spec_value');
  const specs: Record<string, string> = {};
  keys.forEach((key, i) => {
    const k = String(key).trim();
    const v = String(values[i] ?? '').trim();
    if (k) specs[k] = v;
  });
  return specs;
}

async function syncWorkImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workId: string,
  formData: FormData
): Promise<ActionResult> {
  const newFiles = formData.getAll('new_work_files').filter((f): f is File => f instanceof File && f.size > 0);
  const replacementFiles = formData.getAll('replace_work_files').filter((f): f is File => f instanceof File && f.size > 0);
  const replacementIds = formData.getAll('replace_image_ids').map(String).filter(Boolean);
  const newIds = formData.getAll('new_image_ids').map(String).filter(Boolean);
  const deleteIds = formData.getAll('delete_image_ids').map(String).filter(Boolean);
  const selectedCover = String(formData.get('cover_image_id') || '');

  if (replacementFiles.length !== replacementIds.length) {
    return { success: false, message: 'Не удалось сопоставить изменённые фотографии. Обновите страницу и попробуйте снова.' };
  }
  if (newFiles.length !== newIds.length) {
    return { success: false, message: 'Не удалось сопоставить новые фотографии. Обновите страницу и попробуйте снова.' };
  }

  const allFiles = [...newFiles, ...replacementFiles];
  for (const file of allFiles) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return { success: false, message: `Файл «${file.name}»: разрешены JPEG, PNG и WebP.` };
    if (file.size > MAX_IMAGE_SIZE_BYTES) return { success: false, message: `Файл «${file.name}» превышает 8 МБ.` };
  }

  if (deleteIds.length) {
    const { data: doomed, error } = await supabase
      .from('work_images')
      .select('id, storage_path')
      .in('id', deleteIds)
      .eq('work_id', workId);
    if (error) return { success: false, message: actionError('Не удалось подготовить удаление фотографий.', error) };
    if (doomed?.length) {
      const doomedIds = doomed.map((item) => item.id);
      const { error: deleteError } = await supabase.from('work_images').delete().in('id', doomedIds);
      if (deleteError) return { success: false, message: actionError('Не удалось удалить выбранные фотографии.', deleteError) };
      const { error: storageError } = await supabase.storage.from('works').remove(doomed.map((item) => item.storage_path));
      if (storageError) console.error('syncWorkImages: storage remove failed', storageError.message);
    }
  }

  for (let i = 0; i < replacementFiles.length; i += 1) {
    const file = replacementFiles[i];
    const imageId = replacementIds[i];
    const { data: old, error: oldError } = await supabase
      .from('work_images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('work_id', workId)
      .maybeSingle();
    if (oldError || !old) return { success: false, message: 'Одно из изменяемых изображений больше не существует.' };

    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${workId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('works').upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (uploadError) return { success: false, message: `Не удалось загрузить «${file.name}».` };

    const { error: updateError } = await supabase.from('work_images').update({ storage_path: path }).eq('id', imageId).eq('work_id', workId);
    if (updateError) {
      await supabase.storage.from('works').remove([path]);
      return { success: false, message: actionError('Не удалось сохранить изменённую фотографию.', updateError) };
    }
    if (old.storage_path) await supabase.storage.from('works').remove([old.storage_path]);
  }

  const { data: currentMax, error: maxError } = await supabase
    .from('work_images')
    .select('sort_order')
    .eq('work_id', workId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) return { success: false, message: actionError('Не удалось определить порядок фотографий.', maxError) };
  let nextOrder = (currentMax?.sort_order ?? -1) + 1;
  const newIdMap = new Map<string, string>();

  for (let i = 0; i < newFiles.length; i += 1) {
    const file = newFiles[i];
    const clientId = newIds[i];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${workId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('works').upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (uploadError) return { success: false, message: `Не удалось загрузить «${file.name}».` };

    const { data: row, error: insertError } = await supabase
      .from('work_images')
      .insert({ work_id: workId, storage_path: path, sort_order: nextOrder++ })
      .select('id')
      .single();
    if (insertError || !row) {
      await supabase.storage.from('works').remove([path]);
      return { success: false, message: 'Не удалось сохранить новую фотографию.' };
    }
    newIdMap.set(clientId, row.id);
  }

  let finalCover: string | null = null;
  if (selectedCover.startsWith('new:')) finalCover = newIdMap.get(selectedCover) ?? null;
  else if (selectedCover) {
    const { data: cover } = await supabase.from('work_images').select('id').eq('id', selectedCover).eq('work_id', workId).maybeSingle();
    finalCover = cover?.id ?? null;
  }

  if (!finalCover) {
    const { data: first } = await supabase.from('work_images').select('id').eq('work_id', workId).order('sort_order').limit(1).maybeSingle();
    finalCover = first?.id ?? null;
  }
  const { error: coverError } = await supabase.from('works').update({ cover_image_id: finalCover }).eq('id', workId);
  if (coverError) return { success: false, message: actionError('Фотографии сохранены, но не удалось обновить обложку.', coverError) };

  return { success: true, message: 'Фотографии сохранены' };
}

export async function createWork(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = workSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    category_id: formData.get('category_id'),
    description: formData.get('description'),
    price: formData.get('price_mode') === 'negotiable' ? 'По договорённости' : formData.get('price'),
    is_featured: formData.get('is_featured') === 'on',
    sort_order: formData.get('sort_order') || 0,
    status: formData.get('status') || 'published',
    specs: specsFromFormData(formData),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase.from('works').select('id').eq('slug', parsed.data.slug).maybeSingle();
  if (existing) {
    return { success: false, message: 'Работа с таким slug уже существует' };
  }

  const { data, error } = await supabase.from('works').insert(parsed.data).select('id').single();

  if (error) {
    console.error('createWork failed', error.message);
    return { success: false, message: 'Не удалось создать работу. Попробуйте ещё раз.' };
  }

  const imageResult = await syncWorkImages(supabase, data.id, formData);
  if (!imageResult.success) {
    await supabase.from('works').delete().eq('id', data.id);
    return imageResult;
  }
  const { data: firstImage } = await supabase.from('work_images').select('id').eq('work_id', data.id).order('sort_order').limit(1).maybeSingle();
  if (firstImage) await supabase.from('works').update({ cover_image_id: firstImage.id }).eq('id', data.id);

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath('/admin/works');
  return { success: true, message: 'Работа создана', id: data.id };
}

export async function updateWork(
  workId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const parsed = workSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    category_id: formData.get('category_id'),
    description: formData.get('description'),
    price: formData.get('price_mode') === 'negotiable' ? 'По договорённости' : formData.get('price'),
    is_featured: formData.get('is_featured') === 'on',
    sort_order: formData.get('sort_order') || 0,
    status: formData.get('status') || 'published',
    specs: specsFromFormData(formData),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('works')
    .select('id')
    .eq('slug', parsed.data.slug)
    .neq('id', workId)
    .maybeSingle();
  if (existing) {
    return { success: false, message: 'Работа с таким slug уже существует' };
  }

  const { error } = await supabase.from('works').update(parsed.data).eq('id', workId);

  if (error) {
    console.error('updateWork failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить изменения.', error) };
  }

  const imageResult = await syncWorkImages(supabase, workId, formData);
  if (!imageResult.success) {
    return imageResult;
  }

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath(`/works/${parsed.data.slug}`);
  revalidatePath('/admin/works');
  revalidatePath(`/admin/works/${workId}`);
  return { success: true, message: 'Изменения сохранены' };
}

export async function deleteWork(workId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  // Сначала удаляем файлы изображений из Storage, иначе они останутся "осиротевшими"
  const { data: images } = await supabase.from('work_images').select('storage_path').eq('work_id', workId);
  if (images && images.length > 0) {
    await supabase.storage.from('works').remove(images.map((img) => img.storage_path));
  }

  // work_images удалятся каскадно (on delete cascade), cover_image_id обнулится (on delete set null)
  const { error } = await supabase.from('works').delete().eq('id', workId);

  if (error) {
    console.error('deleteWork failed', error.message);
    return { success: false, message: actionError('Не удалось удалить работу.', error) };
  }

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath('/admin/works');
  return { success: true, message: 'Работа удалена' };
}
