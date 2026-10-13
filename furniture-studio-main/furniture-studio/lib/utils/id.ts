/**
 * Генерирует UUID v4 для клиентского кода (временные id для UI, имена файлов
 * и т.п. — не для криптографии).
 *
 * `crypto.randomUUID()` доступен только в secure context (https или
 * localhost) — при открытии админки по обычному http (например, по IP в
 * локальной сети, пока нет SSL-сертификата) `crypto.randomUUID` отсутствует
 * и вызов падает с TypeError, ломая флоу добавления фото к работе. Здесь —
 * фолбэк на Math.random для остальных случаев; результат не криптостойкий,
 * но для локальных идентификаторов и путей в Storage это не требуется.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
