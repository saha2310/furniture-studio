export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatPhoneForHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}
