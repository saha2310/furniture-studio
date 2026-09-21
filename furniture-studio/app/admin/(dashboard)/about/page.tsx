import { getHomeSections, findSection } from '@/lib/queries/home';
import { AboutPageEditor } from '@/components/admin/home/AboutPageEditor';
import { PageHeader } from '@/components/admin/shared/PageHeader';

export default async function AdminAboutPage() {
  const sections = await getHomeSections();
  const about = findSection(sections, 'about_page');
  const body = (about?.content_json as { body?: string } | null)?.body ?? '';

  return (
    <div className="max-w-5xl">
      <PageHeader title="О мастерской" description="Содержимое публичной страницы «О мастерской»." />
      <div className="mt-6">
        <AboutPageEditor title={about?.title ?? null} subtitle={about?.subtitle ?? null} body={body} />
      </div>
    </div>
  );
}
