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
// До этого коммита файлы шли через тело Server Action (updateWork/createWork),
// а Vercel режет тело serverless-функции на 4.5MB жёстко на уровне платформы
// (не настраивается через next.config.mjs). Лимит держали на 4MB с запасом
// под multipart-overhead — но это была защита от смерти по одному файлу; при
// РЕДАКТИРОВАНИИ товара с несколькими фото за раз (удалить старые + добавить
// новые — ровно то, что и должно работать в одно сохранение) суммарное тело
// запроса легко превышало 4.5MB, и весь Server Action молча не долетал до
// сервера: спиннер на кнопке отрабатывал, но ни один из полей формы не
// сохранялся — то есть баг был не в галерее конкретно, а в лимите тела ЛЮБОГО
// запроса на сохранение товара.
//
// Теперь байты фотографий вообще не попадают в тело Server Action: они
// загружаются напрямую из браузера в Supabase Storage (см.
// components/admin/works/WorkImageEditor.tsx и lib/supabase/browser.ts — тот
// же приём уже применялся для lib/backup/, см. его README), а на сервер
// уходят только путь к уже загруженному файлу и id — это килобайты, а не
// мегабайты, и лимит Vercel тут больше ни при чём. Поэтому лимит на размер
// одного файла можно вернуть к разумному 8MB — он ограничен только тем, что
// комфортно грузить с телефона, а не платформой.
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

// Целевые параметры конвертации в WebP — используются как при обычной
// загрузке (lib/utils/image-client.ts), так и в редакторе кадрирования
// (ImageCropDialog.tsx), чтобы оба пути давали предсказуемо одинаковый
// результат, а не два разных представления о "нормальном" сжатии.
//
// 0.86 — компромисс, при котором артефакты сжатия на фото мебели (крупные
// однотонные поверхности, текстуры дерева/ткани) визуально не заметны, а
// файл после конвертации из типичного PNG/JPEG телефонной камеры (3-8MB)
// обычно ужимается в 150-500KB.
export const WEBP_QUALITY = 0.86;
// Длинная сторона, до которой ужимается изображение при загрузке без явного
// кадрирования. Карточка товара, галерея и даже полноэкранный просмотр с
// зумом до 4x (см. WorkGallery.tsx) не выигрывают от исходных 4000-6000px
// с телефона — это лишний вес без видимой разницы в качестве. 2400px с
// запасом перекрывает самый широкий реальный контейнер на сайте (полноэкранный
// просмотр на 4K-мониторе) даже при увеличении.
export const MAX_UPLOAD_DIMENSION = 2400;
