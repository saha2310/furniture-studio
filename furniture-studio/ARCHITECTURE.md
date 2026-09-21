# Архитектура

## Структура проекта

```
app/
  (public)/          — публичный сайт, общий layout с Header/Footer
    page.tsx           — главная, собирает секции из home_sections
    works/              — список и страница отдельной работы
    about/              — страница "О мастерской" (контент из home_sections.about_page)
    contacts/            — контакты + форма заявки
    sitemap.ts, robots.ts

  admin/
    login/              — страница входа, НЕ обёрнута защищённым layout
    (dashboard)/         — route group: все защищённые страницы админки
      layout.tsx            — проверка сессии + сайдбар (второй рубеж защиты после middleware)
      page.tsx               — dashboard
      works/, categories/, home/, about/, contacts/, settings/

  api/
    auth/callback/        — обмен кода на сессию Supabase (email-ссылки и т.п.)

components/
  ui/                  — примитивы (Button, Input, Select, Badge...)
  layout/               — Header, Footer, MobileNav, SocialIcon
  home/                  — секции главной страницы
  works/                  — WorkCard, WorksGrid, WorkGallery, CategoryFilter
  forms/                   — ContactForm
  admin/                    — всё для CMS: layout, works, categories, home, settings, contacts

lib/
  supabase/            — три клиента: client (browser), server (RSC/actions, anon+RLS), admin (service role)
  queries/              — чтение данных (Server Components)
  actions/               — мутации (Server Actions: works, categories, settings, home-sections, contact, auth)
  validations/            — zod-схемы, общие для клиента и сервера
  utils/                   — slug, форматирование, image URL, rate-limit

types/
  database.ts          — типы таблиц Supabase (вручную, синхронизировать с миграциями)
  domain.ts              — доменные типы для UI

supabase/migrations/    — SQL-миграции (схема + RLS + Storage-политики)

middleware.ts            — защита /admin/* на уровне edge, обновление сессии Supabase
```

Отклонение от изначально предложенной структуры: добавлен `lib/queries/` (в исходном плане подразумевался внутри `lib/actions/`) — чтения и мутации разделены явно, чтобы Server Actions-файлы не разрастались и не смешивали ответственность.

Также страницы админки вынесены в route group `admin/(dashboard)/`, а не прямо в `admin/`, чтобы `/admin/login` не наследовал layout с проверкой авторизации (иначе — бесконечный редирект).

---

## Почему Server Actions, а не /api CRUD-роуты

CRUD в админке реализован через Server Actions (`lib/actions/*.ts`), а не через `/api/works` и т.п. Причины:

1. Меньше кода — не нужен отдельный fetch-слой на клиенте и JSON (de)serialization вручную.
2. `useFormState`/`useFormStatus` из React дают loading/error/success состояния "из коробки", без ручного стейт-менеджмента.
3. Меньше JS на клиенте — Server Actions не требуют отдельного API route handler + client-side fetch wrapper.

`/api` оставлен только для того, что реально требует HTTP-эндпоинта — auth callback.

---

## Auth

- Supabase Auth, email+password, один администратор (создаётся вручную в Dashboard — см. README).
- Двойная защита `/admin/*`:
  1. `middleware.ts` — редирект на `/admin/login` на уровне edge, до рендера страницы;
  2. `app/admin/(dashboard)/layout.tsx` — повторная проверка сессии на сервере (defense in depth).
- Каждый Server Action, изменяющий данные, сам вызывает `requireUser()` (`lib/actions/auth-guard.ts`) — это даёт понятное сообщение об ошибке вместо "сырой" ошибки Postgres, если вдруг action был бы вызван без сессии.
- RLS на уровне БД — финальный рубеж: даже если бы проверка в коде была случайно пропущена, Postgres всё равно отклонит запись от неавторизованного пользователя.
- `service_role` key (`lib/supabase/admin.ts`) в проекте создан, но **не используется** ни в одном текущем flow — публичные чтения и запись заявок работают через anon key + RLS, админские мутации — через сессию пользователя + RLS. Клиент оставлен на будущее (например, экспорт данных, batch-операции), помечен `server-only`.

---

## Данные и Storage

Схема: `categories`, `works`, `work_images`, `site_settings` (singleton), `contact_links` (динамический список способов связи), `home_sections` (редактируемые блоки главной/about по ключу), `contact_requests`.

Storage: два публичных бакета — `works` (фото работ + hero-изображение) и `site` (логотип, favicon, OG-картинка). Публичное чтение, запись только для authenticated — политики в самой миграции.

`content_json` (jsonb) в `home_sections` — осознанный выбор вместо отдельных таблиц под каждый тип секции: у Hero, Process и остальных блоков разная структура контента, и жёсткая реляционная схема потребовала бы миграции при каждом изменении состава полей секции. Структура каждого типа секции валидируется zod-схемой на сервере (`lib/validations/home-section.schema.ts`), поэтому гибкость не превращается в бесконтрольность.

---

## SEO

- `generateMetadata` на всех публичных страницах, для `/works/[slug]` — динамически из БД (title, description, OG-изображение = обложка работы).
- Корневой `generateMetadata` в `app/layout.tsx` подтягивает дефолтные title/description/favicon/OG из `site_settings` — то, что вводит администратор в `/admin/settings`, реально используется.
- `sitemap.ts` включает все опубликованные работы, `robots.ts` закрывает `/admin`.

---

## Производительность

- Server Components по умолчанию. `use client` — только там, где нужна интерактивность: `MobileNav`, `ContactForm`, `WorkGallery`, все формы и менеджеры в админке, `ui/`-примитивы с состоянием.
- `next/image` везде, `priority` — на hero и первой карточке в сетках/каруселях.
- Reorder фотографий — кнопками, а не drag-and-drop-библиотекой (без лишней зависимости и связанного JS).
- Анимации — только CSS-transitions (hover/scale), без анимационных библиотек.

## Резервные копии каталога и настроек

Экспорт/импорт/автобэкап на почту — целиком в `lib/backup/`, самодостаточный
модуль со своим README. Если задача не про бэкапы — см. `lib/backup/README.md`
и туда можно не заходить: остальной код проекта его не импортирует.

---

## Что стоит знать перед продакшен-использованием

См. раздел «Известные ограничения» в `README.md` — там перечислено то, что реализовано с осознанным упрощением (in-memory rate limit, отсутствие ролей помимо одного админа, порядок фото без drag-and-drop), а не выдаётся за нечто большее, чем есть.
