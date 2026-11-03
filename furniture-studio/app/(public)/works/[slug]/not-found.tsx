import { ErrorScene } from '@/components/errors/ErrorScene';

export default function WorkNotFound() {
  return (
    <ErrorScene
      side="user"
      code="404"
      title="Такой работы нет"
      text="Возможно, ссылка устарела или работа была снята с публикации. Остальные работы — в каталоге."
    />
  );
}
