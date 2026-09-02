export function CustomMadeSection({
  title,
  description,
}: {
  title?: string | null;
  description?: string | null;
}) {
  return (
    <section className="border-t border-stone/70 bg-espresso text-canvas">
      <div className="container-studio grid gap-8 py-20 md:grid-cols-2 md:gap-16">
        <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
          {title || 'Каждый диван — под конкретное пространство'}
        </h2>
        <p className="max-w-prose text-[17px] text-canvas/85">
          {description ||
            'Мы не продаём модели из каталога. Размер, форма подлокотников, глубина посадки и ткань — под вашу комнату и то, как вы собираетесь этим диваном пользоваться. Поэтому перед изготовлением всегда обсуждаем пространство лично.'}
        </p>
      </div>
    </section>
  );
}
