export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded border border-dashed border-stone px-6 py-16 text-center">
      <p className="text-[17px]">{title}</p>
      {description && <p className="mt-2 text-sm text-espresso">{description}</p>}
    </div>
  );
}
