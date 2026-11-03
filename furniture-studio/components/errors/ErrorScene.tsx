import Link from 'next/link';
import { HammerCat } from './HammerCat';
import { SplitText } from '@/components/motion/SplitText';

/**
 * Полноэкранная белая страница ошибки с котом-ремонтником.
 * side="user" — ошибка в адресе/ссылке (404), side="site" — сбой на нашей стороне.
 * Цвета заданы жёстко (белая страница в любой теме сайта).
 */
export function ErrorScene({
  side,
  code,
  title,
  text,
  action,
}: {
  side: 'user' | 'site';
  code: string;
  title: string;
  text: string;
  /** Дополнительная кнопка (например, «Попробовать снова» с reset()). */
  action?: React.ReactNode;
}) {
  return (
    <div className="error-scene fixed inset-0 z-[200] overflow-y-auto bg-white text-[#141413]">
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-14 text-center">
        <HammerCat className="w-full max-w-[340px]" />

        <p className="hero-in mt-6 inline-flex items-center gap-2 rounded-full border border-[#141413]/15 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#141413]/60" style={{ animationDelay: '150ms' }}>
          <span className={`h-1.5 w-1.5 rounded-full ${side === 'user' ? 'bg-amber-500' : 'bg-red-500'}`} />
          {side === 'user' ? 'Ошибка со стороны пользователя' : 'Ошибка со стороны сайта'} · {code}
        </p>

        <h1 className="mt-5 text-[clamp(2rem,6vw,3.2rem)] leading-[1.05] tracking-[-0.03em]">
          <SplitText text={title} delay={250} step={30} />
        </h1>
        <p className="hero-in mt-4 max-w-md text-[15px] leading-7 text-[#141413]/65" style={{ animationDelay: '600ms' }}>
          {text}
        </p>

        <div className="hero-in mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '750ms' }}>
          {action}
          <Link href="/" className="error-scene-button">На главную</Link>
          <Link href="/works" className="error-scene-button error-scene-button--ghost">Смотреть работы</Link>
        </div>
      </div>
    </div>
  );
}
