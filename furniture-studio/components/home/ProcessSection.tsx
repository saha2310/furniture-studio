import type { ProcessContent } from '@/types/domain';

const FALLBACK: ProcessContent = {
  steps: [
    { title: 'Замер и задача', description: 'Приезжаем или созваниваемся, обсуждаем пространство, сценарий использования и бюджет.' },
    { title: 'Эскиз и материалы', description: 'Предлагаем форму, размеры и ткань/наполнение под ваш интерьер и запрос по износостойкости.' },
    { title: 'Изготовление', description: 'Собираем каркас, обиваем вручную — на конкретный диван, а не по типовому шаблону.' },
    { title: 'Доставка и сборка', description: 'Привозим и устанавливаем на месте, проверяем посадку в пространстве.' },
  ],
};

export function ProcessSection({ content }: { content?: ProcessContent | null }) {
  const steps = content?.steps?.length ? content.steps : FALLBACK.steps;

  return (
    <section className="container-studio py-20">
      <h2 className="max-w-[22ch] text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
        Как создаётся диван
      </h2>
      <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="border-t border-ink pt-4">
            <span className="text-sm text-stone">{String(i + 1).padStart(2, '0')}</span>
            <p className="mt-2 text-lg">{step.title}</p>
            <p className="mt-2 text-[15px] text-espresso">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
