import Link from 'next/link';

export default function WorkNotFound() {
  return (
    <div className="container-studio flex flex-col items-start py-24">
      <h1 className="text-2xl">Такой работы нет</h1>
      <p className="mt-3 max-w-prose text-espresso">
        Возможно, ссылка устарела или работа была снята с публикации.
      </p>
      <Link
        href="/works"
        className="mt-6 inline-flex items-center justify-center rounded bg-ink px-6 py-3 text-[15px] text-canvas hover:bg-espresso"
      >
        Ко всем работам
      </Link>
    </div>
  );
}
