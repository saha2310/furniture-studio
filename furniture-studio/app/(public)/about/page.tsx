import type { Metadata } from 'next';
import Image from 'next/image';
import { getHomeSections } from '@/lib/queries/home';
import { getSiteSettings } from '@/lib/queries/site';
import { workImageUrl, siteAssetUrl } from '@/lib/utils/image';

export const metadata: Metadata = {
  title: 'О мастерской',
  description: 'Небольшая мастерская мягкой мебели — как мы работаем и почему делаем на заказ.',
};

export default async function AboutPage() {
  const [sections, settings] = await Promise.all([getHomeSections(), getSiteSettings()]);
  const about = sections.find((s) => s.key === 'about_page');
  const hero = sections.find((s) => s.key === 'hero');
  const title = about?.title || 'О мастерской';
  const subtitle = about?.subtitle || 'Мягкая мебель на заказ — без типовых моделей и посредников между вами и мастером.';
  const body = (about?.content_json as { body?: string } | null)?.body || 'Мастерская специализируется на диванах ручной работы и креслах в том же комплекте обивки. Каждое изделие мы проектируем под конкретное пространство: замеряем комнату, обсуждаем сценарий использования и подбираем материалы вместе с клиентом.';
  const imagePath = (hero?.content_json as { imagePath?: string } | null)?.imagePath;

  return (
    <div className="pt-[82px]">
      <section className="container-studio grid min-h-[560px] items-end gap-12 border-b border-ink/10 py-20 lg:grid-cols-[.9fr,1.1fr] lg:py-24">
        <div>
          <p className="eyebrow">мастерская</p>
          <h1 className="display-title mt-6 max-w-[9ch]">{title}</h1>
          <p className="mt-8 max-w-[34rem] text-[15px] leading-7 text-espresso">{subtitle}</p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
          {imagePath ? <Image src={workImageUrl(imagePath)} alt="Мастерская мягкой мебели" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgb(var(--fallback-gradient-1)),rgb(var(--fallback-gradient-2))_50%,rgb(var(--fallback-gradient-3)))]" />}
        </div>
      </section>
      <section className="border-b border-ink/10 bg-ink text-canvas">
        <div className="container-studio grid gap-12 py-20 lg:grid-cols-[.7fr,1.3fr] lg:gap-24 lg:py-24">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-canvas/45">о нас</p><p className="mt-8 text-[clamp(4rem,7vw,6rem)] leading-none tracking-[-0.06em]">12<span className="ml-3 text-lg tracking-normal">лет</span></p><p className="mt-3 max-w-[18ch] text-xs leading-5 text-canvas/50">опыта в производстве мягкой мебели</p></div>
          <div><p className="max-w-[54ch] whitespace-pre-line text-[16px] leading-8 text-canvas/65">{body}</p><div className="mt-12 flex flex-wrap gap-x-10 gap-y-3 border-t border-canvas/15 pt-5 text-[11px] uppercase tracking-[0.14em] text-canvas/45"><span>{settings?.company_name || 'УЮТ'}</span><span>Москва</span><span>Индивидуальное производство</span></div></div>
        </div>
      </section>
    </div>
  );
}
