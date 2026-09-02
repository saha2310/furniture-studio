import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWorkBySlug, getAllWorkSlugs } from '@/lib/queries/works';
import { WorkGallery } from '@/components/works/WorkGallery';
import { WorkSpecs } from '@/components/works/WorkSpecs';
import { formatDate } from '@/lib/utils/format';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAllWorkSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const work = await getWorkBySlug(params.slug);
  if (!work) return {};

  return {
    title: work.title,
    description: work.description?.slice(0, 160) || `${work.title} — работа мастерской`,
    openGraph: {
      title: work.title,
      description: work.description?.slice(0, 160) ?? undefined,
      images: work.coverImage ? [{ url: work.coverImage.url }] : undefined,
    },
  };
}

export default async function WorkPage({ params }: Props) {
  const work = await getWorkBySlug(params.slug);
  if (!work) notFound();

  return (
    <div className="container-studio py-14">
      <nav className="text-sm text-stone">
        <Link href="/works" className="hover:text-ink">Работы</Link>
        <span className="mx-2">/</span>
        <span className="text-espresso">{work.category?.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr,1fr] lg:gap-16">
        <WorkGallery images={work.images} title={work.title} />

        <div>
          <h1 className="text-[clamp(1.7rem,3.5vw,2.5rem)] leading-tight">{work.title}</h1>
          <p className="mt-2 text-sm text-stone">{formatDate(work.created_at)}</p>

          {work.description && (
            <p className="mt-6 max-w-prose text-[17px] text-espresso">{work.description}</p>
          )}

          <div className="mt-8">
            <WorkSpecs specs={work.specs} />
          </div>

          <Link
            href="/contacts"
            className="mt-8 inline-flex items-center justify-center rounded bg-ink px-6 py-3.5 text-[15px] text-canvas hover:bg-espresso"
          >
            Обсудить похожий проект
          </Link>
        </div>
      </div>
    </div>
  );
}
