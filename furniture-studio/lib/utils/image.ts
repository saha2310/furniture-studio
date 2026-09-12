const BUCKET_WORKS = 'works';
const BUCKET_SITE = 'site';

function publicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** Публичный URL фотографии работы из storage_path (works bucket). */
export function workImageUrl(storagePath: string): string {
  return publicUrl(BUCKET_WORKS, storagePath);
}

/** Публичный URL файла из site bucket (логотип, favicon, OG-картинка). */
export function siteAssetUrl(storagePath: string): string {
  return publicUrl(BUCKET_SITE, storagePath);
}

/**
 * URL уменьшенной версии изображения через Supabase Storage Image
 * Transformations (эндпоинт render/image вместо object). Используется для
 * миниатюр в медиатеке — грузить там оригиналы (до 4MB каждый) вместо
 * компактных превью и было причиной лагов при открытии.
 *
 * ⚠️ Трансформация изображений — платная функция Supabase (Pro-план и
 * выше) и должна быть включена в Dashboard → Storage → Settings. Если она
 * недоступна на вашем проекте, эндпоинт вернёт ошибку — на этот случай в
 * MediaLibraryPicker есть fallback на оригинал через onError, так что
 * список медиатеки не сломается, а просто продолжит грузить полные файлы.
 */
function thumbUrl(bucket: string, path: string, width = 240): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return '';
  return `${base}/storage/v1/render/image/public/${bucket}/${path}?width=${width}&resize=cover&quality=60`;
}

export function workImageThumbUrl(storagePath: string, width = 240): string {
  return thumbUrl(BUCKET_WORKS, storagePath, width);
}

export function siteAssetThumbUrl(storagePath: string, width = 240): string {
  return thumbUrl(BUCKET_SITE, storagePath, width);
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Было 8MB — но Vercel режет тело serverless-функции на 4.5MB жёстко на
// уровне платформы, это НЕ настраивается через next.config.mjs (см. там же).
// 8MB работал только локально, где этого лимита нет, и тихо ломался бы в
// проде для файлов больше ~4.5MB. Взял 4MB с запасом на накладные расходы
// multipart/form-data (границы, заголовки частей).
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
