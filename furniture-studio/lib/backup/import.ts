// Часть модуля lib/backup/ — см. lib/backup/README.md, если задача не про бэкапы, сюда не нужно.
import 'server-only';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { backupManifestSchema, getSectionImagePath, type BackupManifest, type ImportMode, type ImportSummary } from './types';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/** Читает и валидирует manifest.json из загруженного архива. Бросает понятную ошибку, если формат не тот. */
export async function parseBackupZip(buffer: Buffer): Promise<{ manifest: BackupManifest; zip: JSZip }> {
  const zip = await JSZip.loadAsync(buffer);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('В архиве нет manifest.json — это не бэкап этого проекта.');

  let raw: unknown;
  try {
    raw = JSON.parse(await manifestFile.async('text'));
  } catch {
    throw new Error('manifest.json повреждён и не читается как JSON.');
  }

  const parsed = backupManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Формат архива не распознан (${parsed.error.issues[0]?.message ?? 'неизвестная ошибка'}). Возможно, это бэкап несовместимой версии проекта.`
    );
  }
  return { manifest: parsed.data, zip };
}

async function uploadFromZip(
  supabase: SupabaseClient<Database>,
  zip: JSZip,
  bucket: 'works' | 'site',
  zipPath: string,
  targetPath: string,
  skipped: string[]
) {
  const entry = zip.file(zipPath);
  if (!entry) {
    skipped.push(targetPath);
    return;
  }
  const bytes = await entry.async('nodebuffer');
  const { error } = await supabase.storage
    .from(bucket)
    .upload(targetPath, bytes, { upsert: true, contentType: guessContentType(targetPath) });
  if (error) skipped.push(targetPath);
}

/**
 * Режим "добавить как новые": ничего не удаляет, у категорий/товаров/фото —
 * новые id и слаги с суффиксом. Настройки сайта, меню и способы связи здесь
 * НЕ переносятся — это синглтон-конфигурация, дублировать её незачем (см. README).
 */
async function importAsNew(supabase: SupabaseClient<Database>, manifest: BackupManifest, zip: JSZip): Promise<ImportSummary> {
  const skipped: string[] = [];
  const categoryIdMap = new Map<string, string>();
  const suffix = Date.now().toString(36);

  for (const category of manifest.categories) {
    let newImagePath: string | null = null;
    if (category.image_path) {
      const ext = category.image_path.split('.').pop() || 'webp';
      newImagePath = `categories/${randomUUID()}.${ext}`;
      await uploadFromZip(supabase, zip, 'works', `images/works/${category.image_path}`, newImagePath, skipped);
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name: category.name, slug: `${category.slug}-${suffix}`, sort_order: category.sort_order, image_path: newImagePath })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Не удалось добавить категорию «${category.name}»: ${error?.message ?? 'нет ответа от базы'}`);
    categoryIdMap.set(category.id, data.id);
  }

  let importedWorks = 0;
  let importedImages = 0;

  for (const work of manifest.works) {
    const newCategoryId = categoryIdMap.get(work.category_id);
    if (!newCategoryId) continue; // категория из архива не создалась — пропускаем товар, не валим весь импорт

    const { data: workRow, error: workError } = await supabase
      .from('works')
      .insert({
        category_id: newCategoryId,
        title: work.title,
        slug: `${work.slug}-${suffix}`,
        description: work.description,
        price: work.price,
        specs: work.specs,
        is_featured: work.is_featured,
        sort_order: work.sort_order,
        status: work.status,
      })
      .select('id')
      .single();
    if (workError || !workRow) continue;
    importedWorks += 1;

    let newCoverImageId: string | null = null;
    for (const image of work.images) {
      const ext = image.storage_path.split('.').pop() || 'webp';
      const newPath = `${workRow.id}/${randomUUID()}.${ext}`;
      await uploadFromZip(supabase, zip, 'works', `images/works/${image.storage_path}`, newPath, skipped);

      const { data: imageRow, error: imageError } = await supabase
        .from('work_images')
        .insert({ work_id: workRow.id, storage_path: newPath, alt_text: image.alt_text, sort_order: image.sort_order })
        .select('id')
        .single();
      if (imageError || !imageRow) continue;
      importedImages += 1;
      if (image.id === work.cover_image_id) newCoverImageId = imageRow.id;
    }

    if (newCoverImageId) {
      await supabase.from('works').update({ cover_image_id: newCoverImageId }).eq('id', workRow.id);
    }
  }

  return {
    mode: 'add',
    categories: categoryIdMap.size,
    works: importedWorks,
    images: importedImages,
    contactLinks: 0,
    menuItems: 0,
    homeSections: 0,
    skippedImages: skipped,
  };
}

/**
 * Режим "полностью заменить": необратимо удаляет текущий каталог и настройки,
 * подставляет архив с исходными id и путями файлов. Явное подтверждение у
 * администратора должен взять вызывающий код (Route Handler) ДО вызова этой
 * функции — сама она никаких вопросов не задаёт.
 */
async function importReplace(supabase: SupabaseClient<Database>, manifest: BackupManifest, zip: JSZip): Promise<ImportSummary> {
  const skipped: string[] = [];

  // 1. Запоминаем пути текущих файлов — до того, как удалим ссылающиеся на них строки.
  const [{ data: oldCategories }, { data: oldImages }, { data: oldSettings }, { data: oldSections }] = await Promise.all([
    supabase.from('categories').select('image_path'),
    supabase.from('work_images').select('storage_path'),
    supabase.from('site_settings').select('logo_path, favicon_path, og_image_path').maybeSingle(),
    supabase.from('home_sections').select('content_json'),
  ]);

  const oldWorksBucketPaths = [
    ...(oldImages ?? []).map((row) => row.storage_path),
    ...(oldCategories ?? []).map((row) => row.image_path).filter((path): path is string => Boolean(path)),
    ...(oldSections ?? []).map((row) => getSectionImagePath(row.content_json)).filter((path): path is string => Boolean(path)),
  ];
  const oldSiteBucketPaths = [oldSettings?.logo_path, oldSettings?.favicon_path, oldSettings?.og_image_path].filter(
    (path): path is string => Boolean(path)
  );

  // 2. Удаляем текущий каталог. Порядок обязателен: works.category_id -> categories.id стоит on delete restrict.
  await supabase.from('works').delete().neq('id', NIL_UUID);
  await supabase.from('categories').delete().neq('id', NIL_UUID);

  // 3. Чистим файлы, на которые эти строки ссылались — их DB-записей больше нет.
  if (oldWorksBucketPaths.length) await supabase.storage.from('works').remove(oldWorksBucketPaths);
  if (oldSiteBucketPaths.length) await supabase.storage.from('site').remove(oldSiteBucketPaths);

  // 4. Восстанавливаем каталог из архива — с исходными id и путями файлов.
  for (const category of manifest.categories) {
    if (category.image_path) {
      await uploadFromZip(supabase, zip, 'works', `images/works/${category.image_path}`, category.image_path, skipped);
    }
    const { error } = await supabase.from('categories').insert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sort_order: category.sort_order,
      image_path: category.image_path,
    });
    if (error) throw new Error(`Не удалось восстановить категорию «${category.name}»: ${error.message}`);
  }

  let importedImages = 0;
  for (const work of manifest.works) {
    const { error: workError } = await supabase.from('works').insert({
      id: work.id,
      category_id: work.category_id,
      title: work.title,
      slug: work.slug,
      description: work.description,
      price: work.price,
      specs: work.specs,
      is_featured: work.is_featured,
      sort_order: work.sort_order,
      status: work.status,
      cover_image_id: null, // фото ещё не вставлены — проставим ниже
    });
    if (workError) throw new Error(`Не удалось восстановить товар «${work.title}»: ${workError.message}`);

    for (const image of work.images) {
      await uploadFromZip(supabase, zip, 'works', `images/works/${image.storage_path}`, image.storage_path, skipped);
      const { error: imageError } = await supabase.from('work_images').insert({
        id: image.id,
        work_id: work.id,
        storage_path: image.storage_path,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
      });
      if (!imageError) importedImages += 1;
    }

    if (work.cover_image_id) {
      await supabase.from('works').update({ cover_image_id: work.cover_image_id }).eq('id', work.id);
    }
  }

  // 5. Настройки/меню/связи — обновляем на месте (site_settings и home_sections — по фиксированным
  //    id/key, их не удаляем), контакты и меню — заменяем целиком, это уже не singleton-строки.
  if (manifest.site_settings) {
    const settings = manifest.site_settings;
    if (settings.logo_path) await uploadFromZip(supabase, zip, 'site', `images/site/${settings.logo_path}`, settings.logo_path, skipped);
    if (settings.favicon_path)
      await uploadFromZip(supabase, zip, 'site', `images/site/${settings.favicon_path}`, settings.favicon_path, skipped);
    if (settings.og_image_path)
      await uploadFromZip(supabase, zip, 'site', `images/site/${settings.og_image_path}`, settings.og_image_path, skipped);

    await supabase
      .from('site_settings')
      .update({
        company_name: settings.company_name,
        logo_path: settings.logo_path,
        favicon_path: settings.favicon_path,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        seo_default_title: settings.seo_default_title,
        seo_default_description: settings.seo_default_description,
        og_image_path: settings.og_image_path,
      })
      .eq('id', settings.id);
  }

  await supabase.from('contact_links').delete().neq('id', NIL_UUID);
  for (const link of manifest.contact_links) {
    await supabase.from('contact_links').insert({
      id: link.id,
      platform: link.platform,
      label: link.label,
      url: link.url,
      icon_key: link.icon_key,
      is_visible: link.is_visible,
      sort_order: link.sort_order,
    });
  }

  await supabase.from('site_menu_items').delete().neq('id', NIL_UUID);
  for (const item of manifest.menu_items) {
    await supabase
      .from('site_menu_items')
      .insert({ id: item.id, label: item.label, href: item.href, sort_order: item.sort_order, is_visible: item.is_visible });
  }

  for (const section of manifest.home_sections) {
    const imagePath = getSectionImagePath(section.content_json);
    if (imagePath) await uploadFromZip(supabase, zip, 'works', `images/works/${imagePath}`, imagePath, skipped);

    // home_sections сидируются миграцией по уникальному key — заменяем содержимое, а не строку целиком.
    await supabase
      .from('home_sections')
      .update({
        title: section.title,
        subtitle: section.subtitle,
        content_json: section.content_json,
        is_visible: section.is_visible,
        sort_order: section.sort_order,
      })
      .eq('key', section.key);
  }

  return {
    mode: 'replace',
    categories: manifest.categories.length,
    works: manifest.works.length,
    images: importedImages,
    contactLinks: manifest.contact_links.length,
    menuItems: manifest.menu_items.length,
    homeSections: manifest.home_sections.length,
    skippedImages: skipped,
  };
}

/** Точка входа: разбирает архив и восстанавливает данные в выбранном режиме. */
export async function restoreFromZip(supabase: SupabaseClient<Database>, buffer: Buffer, mode: ImportMode): Promise<ImportSummary> {
  const { manifest, zip } = await parseBackupZip(buffer);
  return mode === 'replace' ? importReplace(supabase, manifest, zip) : importAsNew(supabase, manifest, zip);
}
