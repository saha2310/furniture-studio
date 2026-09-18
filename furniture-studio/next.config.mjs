/** @type {import('next').NextConfig} */
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig = {
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
