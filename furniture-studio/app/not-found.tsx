import type { Metadata } from 'next';
import { ErrorScene } from '@/components/errors/ErrorScene';

export const metadata: Metadata = { title: 'Страница не найдена' };

export default function NotFound() {
  return (
    <ErrorScene
      side="user"
      code="404"
      title="Такой страницы нет"
      text="Похоже, в адресе опечатка или ссылка устарела. Кот уже чинит, а вы пока загляните на главную."
    />
  );
}
