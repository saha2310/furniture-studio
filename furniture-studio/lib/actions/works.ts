'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { workSchema } from '@/lib/validations/work.schema';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/utils/image';

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

  revalidatePath('/works');
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
    return { success: false, message: 'Не удалось сохранить изменения. Попробуйте ещё раз.' };
  }

  revalidatePath('/works');
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
    return { success: false, message: 'Не удалось удалить работу. Попробуйте ещё раз.' };
  }

  revalidatePath('/works');
  revalidatePath('/admin/works');
  return { success: true, message: 'Работа удалена' };
}

export async function uploadWorkImages(workId: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { success: false, message: 'Выберите хотя бы один файл' };
  }

  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return { success: false, message: `Файл ${file.name}: неподдерживаемый формат. Разрешены JPEG, PNG, WebP.` };
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return { success: false, message: `Файл ${file.name} превышает 8 МБ.` };
    }
  }

  const supabase = await createClient();

  const { data: currentMax } = await supabase
    .from('work_images')
    .select('sort_order')
    .eq('work_id', workId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextOrder = (currentMax?.sort_order ?? -1) + 1;
  let uploadedCount = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${workId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('works').upload(path, file, {
      contentType: file.type,
      cacheControl: '31536000',
    });

    if (uploadError) {
      console.error('uploadWorkImages: storage upload failed', uploadError.message);
      continue; // продолжаем с оставшимися файлами, а не прерываем всё
    }

    const { error: insertError } = await supabase.from('work_images').insert({
      work_id: workId,
      storage_path: path,
      sort_order: nextOrder,
    });

    if (insertError) {
      console.error('uploadWorkImages: db insert failed', insertError.message);
      await supabase.storage.from('works').remove([path]); // откатываем осиротевший файл
      continue;
    }

    nextOrder += 1;
    uploadedCount += 1;
  }

  if (uploadedCount === 0) {
    return { success: false, message: 'Не удалось загрузить ни одного файла. Попробуйте ещё раз.' };
  }

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath('/works');

  return {
    success: true,
    message:
      uploadedCount === files.length
        ? `Загружено файлов: ${uploadedCount}`
        : `Загружено ${uploadedCount} из ${files.length} файлов — часть не удалось загрузить`,
  };
}

export async function deleteWorkImage(imageId: string, workId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  const { data: image } = await supabase.from('work_images').select('storage_path').eq('id', imageId).maybeSingle();
  if (!image) {
    return { success: false, message: 'Изображение не найдено' };
  }

  const { error: deleteError } = await supabase.from('work_images').delete().eq('id', imageId);
  if (deleteError) {
    console.error('deleteWorkImage failed', deleteError.message);
    return { success: false, message: 'Не удалось удалить изображение' };
  }

  await supabase.storage.from('works').remove([image.storage_path]);

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath('/works');
  return { success: true, message: 'Изображение удалено' };
}

export async function setCoverImage(workId: string, imageId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from('works').update({ cover_image_id: imageId }).eq('id', workId);

  if (error) {
    console.error('setCoverImage failed', error.message);
    return { success: false, message: 'Не удалось назначить главное фото' };
  }

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath('/works');
  return { success: true, message: 'Главное фото обновлено' };
}

export async function reorderWorkImages(
  workId: string,
  orderedImageIds: string[]
): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  const results = await Promise.all(
    orderedImageIds.map((id, index) =>
      supabase.from('work_images').update({ sort_order: index }).eq('id', id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error('reorderWorkImages failed', failed.error.message);
    return { success: false, message: 'Не удалось сохранить порядок фотографий' };
  }

  revalidatePath(`/admin/works/${workId}`);
  revalidatePath('/works');
  return { success: true, message: 'Порядок сохранён' };
}
