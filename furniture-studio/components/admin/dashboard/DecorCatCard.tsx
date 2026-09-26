import { LoadingCatScene } from '@/components/loading/LoadingCatScene';

// Чисто декоративная плашка — тот же бегущий кот, что и на индикаторе
// загрузки страниц (RouteLoadingCat) и в лайтбоксе галереи, просто здесь он
// ни к чему не привязан и крутится всегда. hideLabel убирает текст
// "Загрузка..." и точки — тут это неуместно, кот не про ожидание.
export function DecorCatCard() {
  return (
    <div className="flex items-center justify-center overflow-hidden border border-ink/10 bg-surface p-4">
      <div className="scale-50 sm:scale-[0.6]">
        <LoadingCatScene hideLabel />
      </div>
    </div>
  );
}
