export function CustomMadeSection({ title, description }: { title?: string | null; description?: string | null }) {
  return (
    <section className="border-b border-ink/10 bg-surface">
      <div className="container-studio grid gap-12 py-24 lg:grid-cols-[.8fr,1fr] lg:gap-24 lg:py-28">
        <div>
          <p className="eyebrow">индивидуальное производство</p>
          <h2 className="display-title mt-6 max-w-[10ch]">{title || 'Под ваше пространство'}</h2>
        </div>
        <div className="flex flex-col justify-end">
          <p className="max-w-[48ch] text-[15px] leading-7 text-espresso">
            {description || 'Размер, форма подлокотников, глубина посадки, наполнение и ткань — всё проектируем под конкретную комнату и сценарий использования.'}
          </p>
          <p className="mt-10 max-w-[42ch] text-[13px] leading-6 text-stone">Каждый диван собирается в мастерской вручную и проходит контроль перед передачей клиенту.</p>
        </div>
      </div>
    </section>
  );
}
