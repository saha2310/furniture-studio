/** @type {import('next').NextConfig} */
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

// --- Заголовки безопасности -------------------------------------------------
// Origin Supabase нужен в CSP: картинки из Storage (img-src) и запросы
// браузерного клиента, в том числе прямая загрузка файлов (connect-src).
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : undefined;
const supabaseWsOrigin = supabaseOrigin?.replace(/^http/, 'ws'); // https -> wss, http -> ws

const isDev = process.env.NODE_ENV !== 'production';

// HSTS и upgrade-insecure-requests включаются ТОЛЬКО когда сайт реально на https
// (NEXT_PUBLIC_SITE_URL начинается с https://). Пока сайт открывается по http,
// upgrade-insecure-requests сломал бы загрузку ресурсов, а HSTS закрепил бы
// в браузерах https, которого ещё нет.
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');

// script-src содержит 'unsafe-inline': Next.js App Router вставляет inline-скрипты
// (RSC-payload), а в app/layout.tsx есть скрипт темы. Строгий CSP на nonce
// потребовал бы middleware на всех страницах и динамический рендер — публичные
// страницы перестали бы быть статическими. 'unsafe-eval' — только для dev (HMR).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  ['img-src', "'self'", 'data:', 'blob:', supabaseOrigin].filter(Boolean).join(' '),
  "font-src 'self' data:",
  ['connect-src', "'self'", supabaseOrigin, supabaseWsOrigin, isDev && 'ws: wss:']
    .filter(Boolean)
    .join(' '),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isHttps && 'upgrade-insecure-requests',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  ...(isHttps
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
    : []),
];

const nextConfig = {
  // Не светим "X-Powered-By: Next.js" в ответах.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [{ protocol: 'https', hostname: supabaseHostname, pathname: '/storage/v1/object/public/**' }]
        : []),
    ],
    formats: ['image/webp'],
  },
  experimental: {
    // 4.5mb — не произвольное число: это жёсткий лимит тела запроса у
    // serverless-функций Vercel, который в принципе нельзя поднять никакой
    // настройкой Next.js. Раньше здесь стояло 10mb — работало на localhost
    // (там этого лимита нет) и тихо ломалось бы в проде уже на файле в 5-6MB.
    // См. lib/utils/image.ts (MAX_IMAGE_SIZE_BYTES) и lib/backup/README.md.
    serverActions: { bodySizeLimit: '4.5mb' },
  },
};

export default nextConfig;
