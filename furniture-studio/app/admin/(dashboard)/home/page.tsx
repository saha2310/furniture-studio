import { getHomeSections, findSection } from '@/lib/queries/home';
import { HeroEditor } from '@/components/admin/home/HeroEditor';
import { ProcessEditor } from '@/components/admin/home/ProcessEditor';
import { SimpleSectionEditor } from '@/components/admin/home/SimpleSectionEditor';
import { PageHeader } from '@/components/admin/shared/PageHeader';
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

  return (
    <div className="max-w-2xl">
      <PageHeader title="Главная страница" description="Тексты, изображение и видимость блоков." />

      <div className="mt-6 flex flex-col gap-6">
        <HeroEditor
          content={(hero?.content_json as unknown as HeroContent) ?? null}
          isVisible={hero?.is_visible ?? true}
        />

        <SimpleSectionEditor
          sectionKey="what_we_create"
          label="Что мы создаём"
          title={whatWeCreate?.title ?? null}
          subtitle={whatWeCreate?.subtitle ?? null}
          isVisible={whatWeCreate?.is_visible ?? true}
          subtitleLabel="Не используется на странице — можно оставить пустым"
        />

        <SimpleSectionEditor
          sectionKey="featured_works"
          label="Избранные работы"
          title={featured?.title ?? null}
          subtitle={featured?.subtitle ?? null}
          isVisible={featured?.is_visible ?? true}
          subtitleLabel="Не используется на странице — можно оставить пустым"
        />

        <ProcessEditor
          content={(process?.content_json as unknown as ProcessContent) ?? null}
          isVisible={process?.is_visible ?? true}
        />

        <SimpleSectionEditor
          sectionKey="custom_made"
          label="Индивидуальное изготовление"
          subtitleLabel="Текст блока"
          title={customMade?.title ?? null}
          subtitle={customMade?.subtitle ?? null}
          isVisible={customMade?.is_visible ?? true}
        />

        <SimpleSectionEditor
          sectionKey="about_teaser"
          label="О мастерской (тизер на главной)"
          subtitleLabel="Текст блока"
          title={aboutTeaser?.title ?? null}
          subtitle={aboutTeaser?.subtitle ?? null}
          isVisible={aboutTeaser?.is_visible ?? true}
        />

        <SimpleSectionEditor
          sectionKey="contact_cta"
          label="Финальный CTA"
          title={contactCta?.title ?? null}
          subtitle={contactCta?.subtitle ?? null}
          isVisible={contactCta?.is_visible ?? true}
          subtitleLabel="Не используется на странице — можно оставить пустым"
        />
      </div>
    </div>
  );
}
