/** Человекочитаемый размер файла (Б/КБ/МБ/ГБ), одна цифра после запятой. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  const units = ['КБ', 'МБ', 'ГБ'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** «+7 900 000-00-00, +7 910 111-22-33» → ['+7 900 000-00-00', '+7 910 111-22-33'].
 *  Разделители: запятая, точка с запятой, перенос строки; также пробел
 *  перед «+» — чтобы «+79100000000 +79000000000» тоже стало двумя номерами. */
export function splitPhones(value: string | null | undefined): string[] {
  return (value ?? '').split(/[,;\n]|\s+(?=\+)/).map((phone) => phone.trim()).filter(Boolean);
}

export function formatPhoneForHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
