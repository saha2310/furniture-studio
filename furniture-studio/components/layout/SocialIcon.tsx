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
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5 8 19 12 5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v14M15 12 21 5M15 12 21 19" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="16.2" cy="7.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="M10 9.5 15.5 12 10 14.5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v10.6a3.4 3.4 0 1 1-3-3.38" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 4c.4 2.6 2.4 4.6 5 5" />
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
