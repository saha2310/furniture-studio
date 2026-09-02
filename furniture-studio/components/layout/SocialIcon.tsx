import type { ContactPlatform } from '@/types/domain';

// Минимальный набор inline SVG-иконок — без сторонней iconpack-зависимости.
// 'custom' и любые ещё не описанные платформы используют иконку-ссылку по умолчанию.
export function SocialIcon({ platform, className = 'h-5 w-5' }: { platform: string; className?: string }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, viewBox: '0 0 24 24' };

  switch (platform as ContactPlatform) {
    case 'phone':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5c0 8.284 6.716 15 15 15l3-4-5-3-2 2c-2-1-4-3-5-5l2-2-3-5-4 2Z" />
        </svg>
      );
    case 'email':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 6.5 8 6 8-6" />
        </svg>
      );
    case 'telegram':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 17-8-3 17-6-5-3 3-1-5Z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18l1-3a8 8 0 1 1 3 3l-4 1Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10c0 3 2 5 5 5" />
        </svg>
      );
    case 'vk':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4c0 6 3 9 4 9V4h4v6c1 0 3-2 4-6h4c-1 4-3 6-5 8 2 1 4 4 5 8h-4c-1-3-3-5-4-5v5H8c-3 0-6-3-6-8 0-3 1-5 2-6" opacity="0" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5c.5 6 3.5 10 7 10 M12 5v10 M12 5c3 0 5.5-2 6.5-5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14a4 4 0 0 0 5.7 0l2-2a4 4 0 0 0-5.7-5.7l-1 1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10a4 4 0 0 0-5.7 0l-2 2a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      );
  }
}
