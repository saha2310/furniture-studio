import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/queries/site';

export const metadata: Metadata = {
  title: 'Политика обработки персональных данных',
  description: 'Сайт не собирает и не хранит персональные данные посетителей.',
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const companyName = settings?.company_name?.trim() || '[название компании]';

  return (
    <div className="pt-[82px]">
      <section className="mx-auto max-w-[70ch] px-6 py-16 sm:px-10 sm:py-20">
        <p className="eyebrow text-ink/50">документ</p>
        <h1 className="mt-4 text-[clamp(2.4rem,5vw,3.6rem)] leading-[0.95] tracking-[-.03em] text-ink">
          Обработка персональных данных
        </h1>

        <div className="mt-12 flex flex-col gap-8 text-sm leading-7 text-ink/75">
          <div>
            <h2 className="mb-2 text-base text-ink">Сайт не собирает персональные данные</h2>
            <p>
              На сайте {companyName} нет форм заявок, регистрации, личного кабинета или аналитических счётчиков.
              Все контакты на странице «Контакты» ведут напрямую на телефон, мессенджер или почту — вы связываетесь
              с нами сами, а сайт при этом не получает и не сохраняет ваше имя, номер телефона или переписку.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base text-ink">Что происходит при обычном посещении сайта</h2>
            <p>
              Как и любой сайт в интернете, при заходе к нам ваш браузер передаёт хостингу технические данные
              запроса (IP-адрес, тип браузера, время обращения) — это стандартная работа любого веб-сервера,
              не анализируется и не используется нами каким-либо образом.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-base text-ink">Если это изменится</h2>
            <p>
              Если в будущем на сайте появятся формы, аналитика (например, Яндекс.Метрика) или другие инструменты,
              собирающие данные посетителей, — эта страница будет обновлена соответствующим образом, а сбор данных
              будет сопровождаться явным согласием.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
