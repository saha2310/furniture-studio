import { getHomeSections, findSection } from '@/lib/queries/home';
import { HeroEditor } from '@/components/admin/home/HeroEditor';
import { ProcessEditor } from '@/components/admin/home/ProcessEditor';
import { SimpleSectionEditor } from '@/components/admin/home/SimpleSectionEditor';
import { PageHeader } from '@/components/admin/shared/PageHeader';
import { AdminSection } from '@/components/admin/shared/AdminSection';
import type { HeroContent, ProcessContent } from '@/types/domain';

export default async function AdminHomePage() {
  const sections = await getHomeSections();
  const hero = findSection(sections, 'hero');
  const whatWeCreate = findSection(sections, 'what_we_create');
  const featured = findSection(sections, 'featured_works');
  const process = findSection(sections, 'process');
  const customMade = findSection(sections, 'custom_made');
  const aboutTeaser = findSection(sections, 'about_teaser');
  const contactCta = findSection(sections, 'contact_cta');

  return <div className="max-w-5xl"><PageHeader title="Главная" description="Редактируйте блоки главной страницы. Большинство секций свернуты, чтобы форма не превращалась в длинную стену полей." /><div className="mt-6 space-y-3">
    <AdminSection title="Первый экран" description="Главный заголовок, описание, кнопки и изображение." defaultOpen><HeroEditor content={(hero?.content_json as unknown as HeroContent) ?? null} isVisible={hero?.is_visible ?? true} /></AdminSection>
    <AdminSection title="Что мы создаём" description="Заголовок и дополнительный текст секции." ><SimpleSectionEditor sectionKey="what_we_create" label="Что мы создаём" title={whatWeCreate?.title ?? null} subtitle={whatWeCreate?.subtitle ?? null} isVisible={whatWeCreate?.is_visible ?? true} subtitleLabel="Дополнительный текст" /></AdminSection>
    <AdminSection title="Избранные работы" description="Заголовок и видимость блока избранных проектов." ><SimpleSectionEditor sectionKey="featured_works" label="Избранные работы" title={featured?.title ?? null} subtitle={featured?.subtitle ?? null} isVisible={featured?.is_visible ?? true} subtitleLabel="Дополнительный текст" /></AdminSection>
    <AdminSection title="Как создаётся диван" description="Шаги процесса и видимость секции." ><ProcessEditor content={(process?.content_json as unknown as ProcessContent) ?? null} isVisible={process?.is_visible ?? true} /></AdminSection>
    <AdminSection title="Индивидуальное изготовление" description="Текст и видимость секции." ><SimpleSectionEditor sectionKey="custom_made" label="Индивидуальное изготовление" title={customMade?.title ?? null} subtitle={customMade?.subtitle ?? null} isVisible={customMade?.is_visible ?? true} subtitleLabel="Текст блока" /></AdminSection>
    <AdminSection title="О мастерской на главной" description="Короткий блок со ссылкой на страницу мастерской." ><SimpleSectionEditor sectionKey="about_teaser" label="О мастерской" title={aboutTeaser?.title ?? null} subtitle={aboutTeaser?.subtitle ?? null} isVisible={aboutTeaser?.is_visible ?? true} subtitleLabel="Текст блока" /></AdminSection>
    <AdminSection title="Финальный призыв к действию" description="Последний CTA на главной." ><SimpleSectionEditor sectionKey="contact_cta" label="Финальный CTA" title={contactCta?.title ?? null} subtitle={contactCta?.subtitle ?? null} isVisible={contactCta?.is_visible ?? true} subtitleLabel="Текст блока" /></AdminSection>
  </div></div>;
}
