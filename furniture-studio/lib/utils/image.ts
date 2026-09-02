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
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
