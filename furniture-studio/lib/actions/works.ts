'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, isUnauthorizedError } from './auth-guard';
import { workSchema } from '@/lib/validations/work.schema';
import { slugify } from '@/lib/utils/slug';
import { actionError } from '@/lib/utils/action-error';

export interface ActionResult {
  success: boolean;
  message: string;
  id?: string;
  // Возвращается, когда сервер сохранил slug, отличный от того, что ввёл
  // администратор (например, из-за коллизии — см. ensureUniqueSlug). Форма
  // использует это, чтобы синхронизировать поле "URL / slug" с тем, что
  // реально записано в БД, а не молча оставлять устаревшее значение.
  slug?: string;
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

function parseWorkFields(formData: FormData) {
  const title = String(formData.get('title') ?? '');
  // Что бы ни ввёл админ в поле URL (кириллицу, заглавные буквы, пробелы —
  // раньше это приводило к ошибке валидации), прогоняем через slugify и
  // получаем корректный slug. Если поле пустое — берём его из названия.
  const rawSlug = String(formData.get('slug') ?? '');
  const normalizedSlug = slugify(rawSlug) || slugify(title);

  return workSchema.safeParse({
    title,
    slug: normalizedSlug,
    category_id: formData.get('category_id'),
    category_ids: formData.getAll('category_ids').map(String),
    description: formData.get('description'),
    price: formData.get('price_mode') === 'negotiable' ? 'По договорённости' : formData.get('price'),
    is_featured: formData.get('is_featured') === 'on',
    sort_order: formData.get('sort_order') || 0,
    status: formData.get('status') || 'published',
    specs: specsFromFormData(formData),
    color_name: formData.get('color_name'),
    color_hex: formData.get('color_hex'),
    group_id: formData.get('group_id'),
    is_primary: formData.get('is_primary') === 'on',
  });
}

function randomSlugSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Если slug уже занят — вместо ошибки для админа сами подбираем свободный
// вариант, добавляя случайные цифры (diван -> divan-4821). DB-констрейнт
// unique на slug гарантирует, что .maybeSingle() ничего лишнего не найдёт.
async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = baseSlug;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let query = supabase.from('works').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${baseSlug}-${randomSlugSuffix()}`;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

// Если новый вариант отмечен основным — снимаем этот флаг со всех остальных
// цветов той же группы, чтобы основным всегда был ровно один вариант.
async function clearOtherPrimaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  keepId: string,
): Promise<void> {
  const { error } = await supabase
    .from('works')
    .update({ is_primary: false })
    .eq('group_id', groupId)
    .neq('id', keepId);
  if (error) console.error('clearOtherPrimaries failed', error.message);
}

// После удаления варианта в группе может не остаться ни одного is_primary —
// повышаем первый по sort_order из оставшихся.
async function ensureGroupHasPrimary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
): Promise<void> {
  const { data: remaining } = await supabase
    .from('works')
    .select('id, is_primary')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true });
  if (!remaining || remaining.length === 0) return;
  if (remaining.some((w) => w.is_primary)) return;
  await supabase.from('works').update({ is_primary: true }).eq('id', remaining[0].id);
}

// Приводит work_categories к переданному списку доп. категорий: строка с
// основной category_id сюда никогда не пишется (она и так есть в самой
// works), даже если админ случайно оставил галочку на своей же основной
// категории в форме — просто отфильтровываем дубль молча, ошибкой это не
// считаем. Полная замена (delete + insert), а не diff — записей мало
// (десяток категорий на сайт), а код проще и не может рассинхронизироваться.
async function syncWorkCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workId: string,
  primaryCategoryId: string,
  selectedCategoryIds: string[],
): Promise<{ success: boolean; message?: string }> {
  const extra = Array.from(new Set(selectedCategoryIds)).filter((id) => id && id !== primaryCategoryId);

  const { error: deleteError } = await supabase.from('work_categories').delete().eq('work_id', workId);
  if (deleteError) return { success: false, message: actionError('Не удалось обновить список категорий.', deleteError) };

  if (extra.length === 0) return { success: true };

  const { error: insertError } = await supabase
    .from('work_categories')
    .insert(extra.map((category_id) => ({ work_id: workId, category_id })));
  if (insertError) return { success: false, message: actionError('Не удалось сохранить дополнительные категории.', insertError) };

  return { success: true };
}

// Полный набор категорий товара: основная + все дополнительные (для
// сравнения "пересекаются ли категории двух товаров" при группировке
// цветовых вариантов — см. attachWorkToGroup ниже).
async function getWorkCategorySet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workId: string,
  primaryCategoryId: string,
): Promise<Set<string>> {
  const { data } = await supabase.from('work_categories').select('category_id').eq('work_id', workId);
  return new Set([primaryCategoryId, ...(data ?? []).map((row) => row.category_id)]);
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const id of a) if (b.has(id)) return true;
  return false;
}

async function syncWorkImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workId: string,
  formData: FormData
): Promise<ActionResult> {
  // ВАЖНО: сюда больше не приходят сами файлы (File/Blob). Байты фотографий
  // администратор уже загрузил напрямую в Supabase Storage прямо из браузера
  // (см. WorkImageEditor.tsx) в момент выбора/кадрирования — эта функция
  // получает только уже готовые storage_path (текст) и работает с ними.
  //
  // Раньше файлы ехали в теле этого Server Action вместе с остальными полями
  // формы. У serverless-функций Vercel есть жёсткий лимит тела запроса
  // 4.5MB, который нельзя поднять настройками Next.js (см. next.config.mjs).
  // При сценарии «удалить старые фото + добавить новые за одно сохранение» —
  // ровно то, что должно работать надёжно, — суммарный размер тела запроса с
  // несколькими реальными фотографиями телефона (2-4MB каждая) стабильно
  // превышал лимит. Результат: весь запрос молча отклонялся платформой ещё
  // до того, как выполнялся код этого Server Action — кнопка «Сохранить»
  // отрабатывала спиннер (запрос ушёл и получил ответ), но ни одно поле
  // формы, включая название/цену/остальное, фактически не сохранялось,
  // потому что action ни разу не был вызван. Это и была причина «жму
  // сохранить — ничего не происходит» из бывшего repro.
  //
  // Вынеся передачу байт за пределы тела этого запроса, мы полностью убираем
  // эту зависимость от размера и количества фотографий — сюда всегда
  // приходят только килобайты текста, сколько бы фото ни редактировалось.
  const newPaths = formData.getAll('new_image_paths').map(String).filter(Boolean);
  const newIds = formData.getAll('new_image_ids').map(String).filter(Boolean);
  const replacementPaths = formData.getAll('replace_image_paths').map(String).filter(Boolean);
  const replacementIds = formData.getAll('replace_image_ids').map(String).filter(Boolean);
  const deleteIds = formData.getAll('delete_image_ids').map(String).filter(Boolean);
  const selectedCover = String(formData.get('cover_image_id') || '');

  if (replacementPaths.length !== replacementIds.length) {
    return { success: false, message: 'Не удалось сопоставить изменённые фотографии. Обновите страницу и попробуйте снова.' };
  }
  if (newPaths.length !== newIds.length) {
    return { success: false, message: 'Не удалось сопоставить новые фотографии. Обновите страницу и попробуйте снова.' };
  }
  // Лёгкая проверка на всякий случай — реальная валидация типа/размера уже
  // прошла на клиенте перед загрузкой в Storage (это единственное место, где
  // у нас в принципе есть доступ к байтам файла).
  for (const path of [...newPaths, ...replacementPaths]) {
    if (!/\.(jpe?g|png|webp)$/i.test(path)) return { success: false, message: 'Один из загруженных файлов имеет неподдерживаемый формат.' };
  }

  // Удаление, замена уже существующих фото и привязка новых не зависят друг
  // от друга (разные id, разные storage-пути), поэтому выполняются
  // параллельно, а не одной длинной очередью.
  async function runDeletions(): Promise<{ success: boolean; message?: string }> {
    if (!deleteIds.length) return { success: true };
    const { data: doomed, error } = await supabase
      .from('work_images')
      .select('id, storage_path')
      .in('id', deleteIds)
      .eq('work_id', workId);
    if (error) return { success: false, message: actionError('Не удалось подготовить удаление фотографий.', error) };
    if (!doomed?.length) return { success: true };
    const doomedIds = doomed.map((item) => item.id);
    // Сначала удаляем строки в БД — это то, что делает изображение
    // действительно отвязанным от товара; файл в Storage подчищаем следом
    // (если это не получится — фото уже не привязано к товару, просто
    // останется "осиротевший" файл, не повреждённые данные).
    const { error: deleteError } = await supabase.from('work_images').delete().in('id', doomedIds);
    if (deleteError) return { success: false, message: actionError('Не удалось удалить выбранные фотографии.', deleteError) };
    const { error: storageError } = await supabase.storage.from('works').remove(doomed.map((item) => item.storage_path));
    if (storageError) console.error('syncWorkImages: storage remove failed', storageError.message);
    return { success: true };
  }

  async function runReplacements(): Promise<{ success: boolean; message?: string }> {
    if (!replacementPaths.length) return { success: true };
    const results = await Promise.all(
      replacementPaths.map(async (path, i) => {
        const imageId = replacementIds[i];
        const { data: old, error: oldError } = await supabase
          .from('work_images')
          .select('storage_path')
          .eq('id', imageId)
          .eq('work_id', workId)
          .maybeSingle();
        if (oldError || !old) {
          await supabase.storage.from('works').remove([path]);
          return { success: false as const, message: 'Одно из изменяемых изображений больше не существует.' };
        }
        const { error: updateError } = await supabase.from('work_images').update({ storage_path: path }).eq('id', imageId).eq('work_id', workId);
        if (updateError) {
          await supabase.storage.from('works').remove([path]);
          return { success: false as const, message: actionError('Не удалось сохранить изменённую фотографию.', updateError) };
        }
        if (old.storage_path && old.storage_path !== path) await supabase.storage.from('works').remove([old.storage_path]);
        return { success: true as const };
      })
    );
    const failed = results.find((r) => !r.success);
    return failed ?? { success: true };
  }

  async function attachNewImages(): Promise<{ success: boolean; message?: string; idMap: Map<string, string> }> {
    const idMap = new Map<string, string>();
    if (!newPaths.length) return { success: true, idMap };

    const { data: currentMax, error: maxError } = await supabase
      .from('work_images')
      .select('sort_order')
      .eq('work_id', workId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) return { success: false, message: actionError('Не удалось определить порядок фотографий.', maxError), idMap };
    const startOrder = (currentMax?.sort_order ?? -1) + 1;

    // Один batch-insert вместо N отдельных запросов. Сопоставляем обратно по
    // storage_path (уникален за счёт временной метки + случайного суффикса,
    // проставленных при загрузке на клиенте), а не по порядку в ответе.
    const { data: rows, error: insertError } = await supabase
      .from('work_images')
      .insert(newPaths.map((path, i) => ({ work_id: workId, storage_path: path, sort_order: startOrder + i })))
      .select('id, storage_path');
    if (insertError || !rows) {
      await supabase.storage.from('works').remove(newPaths);
      return { success: false, message: 'Не удалось сохранить новые фотографии.', idMap };
    }
    const pathToId = new Map(rows.map((row) => [row.storage_path, row.id]));
    newPaths.forEach((path, i) => {
      const id = pathToId.get(path);
      if (id) idMap.set(newIds[i], id);
    });
    return { success: true, idMap };
  }

  const [deleteResult, replacementResult, newAttachResult] = await Promise.all([runDeletions(), runReplacements(), attachNewImages()]);
  if (!deleteResult.success) return { success: false, message: deleteResult.message ?? 'Не удалось удалить выбранные фотографии.' };
  if (!replacementResult.success) return { success: false, message: replacementResult.message ?? 'Не удалось сохранить изменённые фотографии.' };
  if (!newAttachResult.success) return { success: false, message: newAttachResult.message ?? 'Не удалось сохранить новые фотографии.' };
  const newIdMap = newAttachResult.idMap;

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

  const parsed = parseWorkFields(formData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();

  const finalSlug = await ensureUniqueSlug(supabase, parsed.data.slug);

  // group_id из формы означает «это ещё один цвет уже существующего товара».
  // Пустое значение — это отдельный новый товар: group_id подставит триггер
  // в БД (= собственному id), и он автоматически становится основным цветом.
  const requestedGroupId = parsed.data.group_id || '';
  let groupId: string | undefined;
  let isPrimary = true;

  if (requestedGroupId) {
    const { data: groupExists } = await supabase.from('works').select('id').eq('group_id', requestedGroupId).limit(1).maybeSingle();
    if (!groupExists) {
      return { success: false, message: 'Товар, к которому добавляется цвет, не найден.' };
    }
    groupId = requestedGroupId;
    isPrimary = parsed.data.is_primary;
  }

  const { data, error } = await supabase
    .from('works')
    .insert({
      title: parsed.data.title,
      slug: finalSlug,
      category_id: parsed.data.category_id,
      description: parsed.data.description || null,
      price: parsed.data.price || null,
      specs: parsed.data.specs,
      is_featured: parsed.data.is_featured,
      sort_order: parsed.data.sort_order,
      status: parsed.data.status,
      color_name: parsed.data.color_name || null,
      color_hex: parsed.data.color_hex || null,
      group_id: groupId,
      is_primary: isPrimary,
    })
    .select('id')
    .single();

  if (error) {
    console.error('createWork failed', error.message);
    return { success: false, message: 'Не удалось создать работу. Попробуйте ещё раз.' };
  }

  if (groupId && isPrimary) {
    await clearOtherPrimaries(supabase, groupId, data.id);
  }

  const categoriesResult = await syncWorkCategories(supabase, data.id, parsed.data.category_id, parsed.data.category_ids);
  if (!categoriesResult.success) {
    await supabase.from('works').delete().eq('id', data.id);
    return { success: false, message: categoriesResult.message ?? 'Не удалось сохранить категории.' };
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
  return {
    success: true,
    message: finalSlug === parsed.data.slug ? 'Работа создана' : `Работа создана. Адрес страницы уже был занят, поэтому сохранили как /works/${finalSlug}`,
    id: data.id,
    slug: finalSlug,
  };
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

  const parsed = parseWorkFields(formData);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' };
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from('works')
    .select('id, group_id, is_primary')
    .eq('id', workId)
    .maybeSingle();
  if (currentError || !current) {
    return { success: false, message: 'Работа не найдена.' };
  }

  const { data: existing } = await supabase
    .from('works')
    .select('id')
    .eq('slug', parsed.data.slug)
    .neq('id', workId)
    .maybeSingle();
  const finalSlug = existing ? await ensureUniqueSlug(supabase, parsed.data.slug, workId) : parsed.data.slug;

  // group_id не редактируется формой напрямую — цвет либо создаётся сразу
  // в нужной группе (createWork), либо остаётся в своей навсегда.
  // Если это единственный вариант в группе — он всегда остаётся основным,
  // чекбокс в форме на такой товар не влияет.
  const { data: siblingCount } = await supabase.from('works').select('id').eq('group_id', current.group_id).neq('id', workId).limit(1);
  const hasSiblings = (siblingCount?.length ?? 0) > 0;
  const nextIsPrimary = hasSiblings ? parsed.data.is_primary : true;

  const { error } = await supabase
    .from('works')
    .update({
      title: parsed.data.title,
      slug: finalSlug,
      category_id: parsed.data.category_id,
      description: parsed.data.description || null,
      price: parsed.data.price || null,
      specs: parsed.data.specs,
      is_featured: parsed.data.is_featured,
      sort_order: parsed.data.sort_order,
      status: parsed.data.status,
      color_name: parsed.data.color_name || null,
      color_hex: parsed.data.color_hex || null,
      is_primary: nextIsPrimary,
    })
    .eq('id', workId);

  if (error) {
    console.error('updateWork failed', error.message);
    return { success: false, message: actionError('Не удалось сохранить изменения.', error) };
  }

  if (nextIsPrimary) {
    await clearOtherPrimaries(supabase, current.group_id, workId);
  } else if (current.is_primary) {
    // Сняли «основной» с единственного, кто им был, — группе нужен новый.
    await ensureGroupHasPrimary(supabase, current.group_id);
  }

  const categoriesResult = await syncWorkCategories(supabase, workId, parsed.data.category_id, parsed.data.category_ids);
  if (!categoriesResult.success) {
    return { success: false, message: categoriesResult.message ?? 'Не удалось сохранить категории.' };
  }

  const imageResult = await syncWorkImages(supabase, workId, formData);
  if (!imageResult.success) {
    return imageResult;
  }

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath(`/works/${finalSlug}`);
  revalidatePath('/admin/works');
  revalidatePath(`/admin/works/${workId}`);
  return {
    success: true,
    message: finalSlug === parsed.data.slug ? 'Изменения сохранены' : `Изменения сохранены. Адрес страницы уже был занят, сохранили как /works/${finalSlug}`,
    slug: finalSlug,
  };
}

export async function deleteWork(workId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  const { data: doomed } = await supabase.from('works').select('group_id').eq('id', workId).maybeSingle();

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

  // Если в группе остались другие цвета, а основной был именно этот — назначаем нового.
  if (doomed?.group_id) await ensureGroupHasPrimary(supabase, doomed.group_id);

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath('/admin/works');
  return { success: true, message: 'Работа удалена' };
}

// Открепить товар от группы цветовых вариантов, НЕ удаляя сам товар и его
// фото — в отличие от deleteWork, который стирает запись целиком. Раньше
// единственным способом «убрать цвет» было полное удаление товара, из-за
// чего терялись и сам товар, и его фотографии — хотя по факту нужно было
// просто расцепить связь и оставить товар отдельной карточкой. Присваиваем
// товару собственный group_id (= его id, ровно то же значение, которое
// поставил бы триггер works_set_group_id_trigger при обычном создании
// одиночного товара) и делаем его основным в этой новой группе из одного.
export async function detachWorkFromGroup(workId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase.from('works').select('id, group_id, is_primary').eq('id', workId).maybeSingle();
  if (currentError || !current) return { success: false, message: 'Работа не найдена.' };

  if (current.group_id === workId) {
    return { success: true, message: 'Этот товар уже не привязан к другим цветам.' };
  }

  const oldGroupId = current.group_id;

  const { error } = await supabase.from('works').update({ group_id: workId, is_primary: true }).eq('id', workId);
  if (error) return { success: false, message: actionError('Не удалось отвязать товар от группы цветов.', error) };

  // В старой группе мог остаться без единого «основного» варианта, если
  // именно этот товар им был.
  if (current.is_primary) await ensureGroupHasPrimary(supabase, oldGroupId);

  revalidatePath('/works');
  revalidatePath('/admin/works');
  revalidatePath(`/admin/works/${workId}`);
  return { success: true, message: 'Товар откреплён и стал отдельной карточкой' };
}

// Обратная операция к detachWorkFromGroup: прикрепить уже существующий
// самостоятельный товар (group_id === его собственный id) как ещё один
// цветовой вариант к группе targetGroupId. Раньше единственным способом
// добавить цвет было «+ Новый цвет», создающее товар с нуля — если админ
// по ошибке уже успел создать его отдельной карточкой, приходилось удалять
// и пересоздавать. Вызывающая сторона (getStandaloneWorksAdmin) уже
// отфильтровывает кандидатов до «ни к кому не привязанных», но проверяем
// это ещё раз на сервере — на случай, если список на клиенте успел устареть,
// иначе можно случайно слить две уже готовые группы цветов в одну.
export async function attachWorkToGroup(workId: string, targetGroupId: string): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  if (workId === targetGroupId) return { success: false, message: 'Товар не может быть цветом самого себя.' };

  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase.from('works').select('id, group_id, category_id').eq('id', workId).maybeSingle();
  if (currentError || !current) return { success: false, message: 'Работа не найдена.' };
  if (current.group_id !== workId) return { success: false, message: 'Этот товар уже привязан к другой группе цветов — сначала открепите его.' };

  const { data: target, error: targetError } = await supabase.from('works').select('id, category_id').eq('id', targetGroupId).maybeSingle();
  if (targetError || !target) return { success: false, message: 'Целевая группа не найдена.' };

  // Раньше требовалось точное совпадение category_id. С появлением
  // дополнительных категорий (work_categories) это стало слишком строгим:
  // например, у дивана основная категория «Диваны», а у кресла — «Кресла»,
  // но если оба параллельно отмечены как «Диваны+Кресла» (общая коллекция),
  // это по смыслу один продукт в разных цветах. Поэтому сравниваем полные
  // наборы категорий (основная + доп.) — достаточно, чтобы они хотя бы
  // пересекались.
  const [currentCategories, targetCategories] = await Promise.all([
    getWorkCategorySet(supabase, current.id, current.category_id),
    getWorkCategorySet(supabase, target.id, target.category_id),
  ]);
  if (!hasOverlap(currentCategories, targetCategories)) {
    return { success: false, message: 'У товаров нет общей категории — варианты одного товара должны иметь хотя бы одну общую категорию.' };
  }

  const { error } = await supabase.from('works').update({ group_id: targetGroupId, is_primary: false }).eq('id', workId);
  if (error) return { success: false, message: actionError('Не удалось прикрепить товар как цвет.', error) };

  revalidatePath('/works');
  revalidatePath('/admin/works');
  revalidatePath(`/admin/works/${targetGroupId}`);
  revalidatePath(`/admin/works/${workId}`);
  return { success: true, message: 'Товар добавлен как цветовой вариант' };
}

// Быстрое переключение статуса из карточки в списке (без открытия полной
// формы редактирования) — используется в WorkStatusToggle, само действие
// подтверждается на клиенте через ConfirmDialog, здесь только сама мутация.
export async function toggleWorkStatus(workId: string, nextStatus: 'draft' | 'published'): Promise<ActionResult> {
  try {
    await requireUser();
  } catch (e) {
    if (isUnauthorizedError(e)) return { success: false, message: 'Требуется авторизация.' };
    throw e;
  }

  if (nextStatus !== 'draft' && nextStatus !== 'published') {
    return { success: false, message: 'Некорректный статус.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('works')
    .update({ status: nextStatus })
    .eq('id', workId)
    .select('slug')
    .maybeSingle();

  if (error) {
    console.error('toggleWorkStatus failed', error.message);
    return { success: false, message: actionError('Не удалось изменить статус.', error) };
  }

  revalidatePath('/works');
  revalidatePath('/favorites');
  revalidatePath('/admin/works');
  if (data?.slug) revalidatePath(`/works/${data.slug}`);
  return { success: true, message: nextStatus === 'published' ? 'Работа опубликована' : 'Работа скрыта' };
}
