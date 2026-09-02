import type { Metadata } from 'next';
import { getHomeSections } from '@/lib/queries/home';

export const metadata: Metadata = {
  title: 'О мастерской',
  description: 'Небольшая мастерская мягкой мебели — как мы работаем и почему делаем на заказ.',
};

export default async function AboutPage() {
  const sections = await getHomeSections();
  const about = sections.find((s) => s.key === 'about_page');

  const title = about?.title || 'О мастерской';
  const subtitle =
    about?.subtitle ||
    'Мы делаем мягкую мебель на заказ — без типовых моделей и посредников между вами и мастером.';
  const body =
    (about?.content_json as { body?: string } | null)?.body ||
    'Мастерская специализируется на диванах ручной работы, дополнительно — креслах в том же комплекте обивки. Каждое изделие мы проектируем под конкретное пространство: замеряем комнату, обсуждаем сценарий использования и подбираем материалы вместе с клиентом. Каркас и обивка выполняются в мастерской от начала до конца — это позволяет контролировать качество на каждом этапе и брать на себя ответственность за результат.';

  return (
    <div className="container-studio py-14">
      <h1 className="max-w-[20ch] text-[clamp(1.8rem,4vw,2.75rem)] leading-tight">{title}</h1>
      <p className="mt-4 max-w-prose text-lg text-espresso">{subtitle}</p>
      <div className="mt-10 max-w-prose whitespace-pre-line text-[17px] leading-relaxed text-ink">
        {body}
      </div>
    </div>
  );
}
