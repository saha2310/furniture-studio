// Простейший in-memory rate limit для формы заявки (honeypot + ограничение по IP).
// На serverless (Vercel) состояние не гарантированно переживает между инстансами —
// это осознанный компромисс: полноценный rate limit потребовал бы Redis/Upstash,
// что не было согласовано как часть стека. Задокументировано в README как известное ограничение.
const submissions = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 3;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (submissions.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  submissions.set(key, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}
