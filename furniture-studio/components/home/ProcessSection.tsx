import type { ProcessContent } from '@/types/domain';

const FALLBACK: ProcessContent = {
  steps: [
    { title: 'Замер', description: 'Приезжаем в пространство, снимаем размеры и обсуждаем задачу.' },
    { title: 'Конструкция', description: 'Проектируем форму, глубину посадки, каркас и детали.' },
    { title: 'Производство', description: 'Создаём изделие вручную в собственной мастерской.' },
    { title: 'Доставка', description: 'Доставляем и собираем диван на месте.' },
  ],
};

export function ProcessSection({ content }: { content?: ProcessContent | null }) {
  const steps = content?.steps?.length ? content.steps : FALLBACK.steps;

  return (
    <section className="border-b border-canvas/10 bg-ink text-canvas">
      <div className="container-studio grid gap-14 py-20 lg:grid-cols-[.7fr,1.8fr] lg:gap-24 lg:py-24">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-canvas/45">процесс</p>
          <h2 className="mt-5 max-w-[8ch] text-[clamp(2.7rem,5vw,5.2rem)] leading-[.92] tracking-[-0.04em]">Как мы работаем</h2>
        </div>
        <ol className="grid border-t border-canvas/15 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li key={`${step.title}-${i}`} className="border-b border-canvas/15 p-6 sm:border-r sm:p-7 xl:min-h-[250px]">
              <div className="flex items-center gap-4 text-[12px] text-canvas/45">
                <span>{String(i + 1).padStart(2, '0')}</span><span className="h-px flex-1 bg-canvas/15" />
              </div>
              <h3 className="mt-14 text-[16px] uppercase tracking-[0.04em]">{step.title}</h3>
              <p className="mt-4 text-[13px] leading-6 text-canvas/55">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
