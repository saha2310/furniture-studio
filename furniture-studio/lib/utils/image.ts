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

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Было 8MB — но Vercel режет тело serverless-функции на 4.5MB жёстко на
// уровне платформы, это НЕ настраивается через next.config.mjs (см. там же).
// 8MB работал только локально, где этого лимита нет, и тихо ломался бы в
// проде для файлов больше ~4.5MB. Взял 4MB с запасом на накладные расходы
// multipart/form-data (границы, заголовки частей).
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
