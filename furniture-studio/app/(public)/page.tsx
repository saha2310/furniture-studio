import type { Metadata } from 'next';
import { getHomeSections, findSection } from '@/lib/queries/home';
import { getFeaturedWorks, getCategories } from '@/lib/queries/works';
import { getSiteSettings } from '@/lib/queries/site';
import { Hero } from '@/components/home/Hero';
import { WhatWeCreate } from '@/components/home/WhatWeCreate';
import { FeaturedWorks } from '@/components/home/FeaturedWorks';
import { ProcessSection } from '@/components/home/ProcessSection';
import { CustomMadeSection } from '@/components/home/CustomMadeSection';
import { AboutTeaser } from '@/components/home/AboutTeaser';
import { ContactCTA } from '@/components/home/ContactCTA';
import type { HeroContent, ProcessContent } from '@/types/domain';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings?.seo_default_title || undefined,
    description: settings?.seo_default_description || undefined,
  };
}

export default async function HomePage() {
  const [sections, featuredWorks, categories] = await Promise.all([
    getHomeSections(),
    getFeaturedWorks(),
    getCategories(),
  ]);

  const hero = findSection(sections, 'hero');
  const whatWeCreate = findSection(sections, 'what_we_create');
  const featuredSection = findSection(sections, 'featured_works');
  const process = findSection(sections, 'process');
  const customMade = findSection(sections, 'custom_made');
  const aboutTeaser = findSection(sections, 'about_teaser');
  const contactCta = findSection(sections, 'contact_cta');

  // Отсутствующая запись секции в БД трактуется как "видима, дефолтный контент" —
  // так сайт не ломается, если админ ещё не заходил в /admin/home.
  const isVisible = (section: typeof hero) => section?.is_visible !== false;

  return (
    <>
      {isVisible(hero) && <Hero content={(hero?.content_json as unknown as HeroContent) ?? null} />}

      {isVisible(whatWeCreate) && <WhatWeCreate categories={categories} title={whatWeCreate?.title} />}

      {isVisible(featuredSection) && <FeaturedWorks works={featuredWorks} title={featuredSection?.title} />}

      {isVisible(process) && (
        <ProcessSection content={(process?.content_json as unknown as ProcessContent) ?? null} />
      )}

      {isVisible(customMade) && (
        <CustomMadeSection title={customMade?.title} description={customMade?.subtitle} />
      )}

      {isVisible(aboutTeaser) && (
        <AboutTeaser title={aboutTeaser?.title} subtitle={aboutTeaser?.subtitle} />
      )}

      {isVisible(contactCta) && <ContactCTA title={contactCta?.title} />}
    </>
  );
}
