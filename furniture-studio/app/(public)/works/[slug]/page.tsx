import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getWorkBySlug, getAllWorkSlugs } from '@/lib/queries/works';
import { WorkGallery } from '@/components/works/WorkGallery';
import { ProjectDescription } from '@/components/works/ProjectDescription';
import { WorkSpecs } from '@/components/works/WorkSpecs';

interface Props { params: { slug: string } }

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
    openGraph: { title: work.title, description: work.description?.slice(0, 160) ?? undefined, images: work.coverImage ? [{ url: work.coverImage.url }] : undefined },
  };
}

export default async function WorkPage({ params }: Props) {
  const work = await getWorkBySlug(params.slug);
  if (!work) notFound();

  const heroImage = work.coverImage ?? work.images[0];

  return (
    <div className="pt-[82px]">
      <section className="relative min-h-[720px] overflow-hidden border-b border-white/10 lg:min-h-[calc(100vh-82px)]">
        {heroImage ? <Image src={heroImage.url} alt={heroImage.alt_text || work.title} fill priority sizes="100vw" className="object-cover" /> : <div className="absolute inset-0 bg-[#24231f]" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
        <div className="container-studio relative z-10 flex min-h-[720px] flex-col justify-end pb-12 lg:min-h-[calc(100vh-82px)] lg:pb-14">
          <p className="eyebrow text-white/50">{work.category?.name || 'проект'}</p>
          <h1 className="mt-5 max-w-[11ch] text-[clamp(3.6rem,8vw,8rem)] leading-[.87] tracking-[-.055em] text-white">{work.title}</h1>
          <div className="mt-10 flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-white/55">
            <span>01</span><span className="h-px w-16 bg-white/25" /><span>{String(work.images.length || 1).padStart(2, '0')}</span>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#1a1918]">
        <div className="grid lg:grid-cols-[90px,1.3fr,1fr]">
          <div className="hidden border-r border-white/10 py-10 lg:flex lg:flex-col lg:items-center lg:justify-between">
            <span className="text-3xl tracking-[-0.04em]">01</span>
            <div className="flex flex-col items-center gap-4 text-stone"><span>↑</span><span className="h-20 w-px bg-white/10" /><span>↓</span></div>
          </div>
          <div className="min-h-[520px] border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-10">
            <WorkGallery images={work.images} title={work.title} />
          </div>
          <div className="p-8 sm:p-10 lg:p-14">
            <p className="eyebrow">проект</p>
            <h2 className="mt-5 text-[clamp(2.4rem,4vw,4.2rem)] leading-[.95] tracking-[-.045em]">{work.title}</h2>
            <p className="mt-5 text-sm text-espresso">{work.category?.name}</p>{work.price && <p className="mt-3 text-sm text-white">{work.price}</p>}
            {work.description && <ProjectDescription text={work.description} />}
            <div className="mt-12"><WorkSpecs specs={work.specs} /></div>
            <Link href="/contacts" className="group reference-button mt-12">Обсудить похожий проект <span className="transition-transform duration-300 group-hover:translate-x-1">→</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
