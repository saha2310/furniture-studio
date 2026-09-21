// Браузерная (canvas) конвертация загружаемых изображений в WebP.
//
// Импортировать этот модуль можно ТОЛЬКО из клиентских компонентов
// ('use client') — здесь используются Image(), document.createElement('canvas')
// и URL.createObjectURL, которых нет на сервере. Серверные пути (lib/actions/*)
// продолжают получать уже готовые файлы/пути и ничего не декодируют сами —
// см. lib/utils/image.ts для констант и серверных URL-хелперов.
//
// Единая точка конвертации нужна, чтобы WebP получался при ЛЮБОЙ загрузке —
// не только когда админ открывает редактор кадрирования (components/admin/
// shared/ImageCropDialog.tsx). До этого коммита конвертация была опциональной
// (только внутри кропа), поэтому PNG/JPEG, добавленные без кадрирования,
// так и оставались PNG/JPEG в Storage навсегда.
import { MAX_UPLOAD_DIMENSION, WEBP_QUALITY } from './image';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось декодировать изображение'));
    img.src = url;
  });
}

/**
 * Конвертирует файл в WebP без кадрирования: сохраняет исходные пропорции,
 * уменьшает длинную сторону до MAX_UPLOAD_DIMENSION (только вниз — маленькие
 * изображения не увеличиваются, апскейл только портит качество).
 *
 * Если файл уже WebP и уже не превышает лимит — возвращает исходный файл как
 * есть, без повторного перекодирования (повторное сжатие только теряет
 * качество, а выгоды в размере обычно нет).
 *
 * Не бросает исключение при неудаче: если canvas/декодирование недоступны
 * (например, повреждённый файл), возвращает исходный файл — лучше сохранить
 * то, что есть, чем полностью заблокировать загрузку из-за оптимизации.
 */
export async function convertToWebp(
  file: File,
  { maxDimension = MAX_UPLOAD_DIMENSION, quality = WEBP_QUALITY }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    const { naturalWidth: width, naturalHeight: height } = img;
    if (!width || !height) return file;

    const alreadyWebp = file.type === 'image/webp';
    const withinBounds = Math.max(width, height) <= maxDimension;
    if (alreadyWebp && withinBounds) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, outWidth, outHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') || `image-${Date.now()}`;
    return new File([blob], `${name}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
