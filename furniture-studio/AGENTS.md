# AGENTS.md — читать ПЕРВЫМ, до любого просмотра дерева файлов

Цель файла: агент решает 90% задач, прочитав только этот файл + 1-3 файла из
карты ниже. НЕ обходить директории `view`, НЕ читать проект "чтобы
разобраться" — вся структура уже описана здесь.

---

## 0. Что НИКОГДА не открывать (мусор для контекста)

- `tsconfig.tsbuildinfo` (348K) — служебный кэш TS, не код.
- `package-lock.json` (236K) — открывать только если реально нужно смотреть
  резолвнутую версию пакета.
- `node_modules/` — не существует в архиве, но если появится — не трогать.
- `lib/backup/**` — самодостаточный модуль экспорта/импорта/автобэкапа.
  **Открывать только если задача явно про бэкапы.** Остальной код его не
  импортирует. Своя документация: `lib/backup/README.md`.

## 1. Куда идти по типу задачи (без чтения дерева)

| Задача | Файлы, которых достаточно |
|---|---|
| Понять "почему так", деплой, ENV | `README.md`, `ARCHITECTURE.md` |
| Что и зачем менялось в админке | `ADMIN_AUDIT.md` |
| Добавить/поменять поле у сущности (works/categories/...) | см. таблицу §3 |
| Поменять контент секции главной (Hero/Process/...) | `lib/validations/home-section.schema.ts` + `lib/actions/home-sections.ts` + конкретный `components/home/*Editor.tsx` + `components/home/*.tsx` (рендер) |
| Поменять/добавить страницу публичного сайта | `app/(public)/**` — искать по имени роута, не листать всю папку |
| Поменять UI-примитив (кнопка, инпут...) | `components/ui/*.tsx` — файлы маленькие (десятки строк), открывать точечно по имени |
| Что-то про Storage/загрузку фото | `lib/utils/image.ts`, конкретный action (см. §3) |
| Схема БД / RLS | `supabase/migrations/*.sql` — см. §4, порядок важен |
| Бэкапы/экспорт/импорт | `lib/backup/README.md` — дальше сам |

## 2. Единый CRUD-скелет (одинаков для всех сущностей)

Каждая сущность (works, categories, contact-requests, settings,
home-sections) состоит из одного и того же набора файлов-ролей:

```
lib/validations/<entity>.schema.ts   — zod-схема (источник правды по полям)
lib/actions/<entity>.ts              — мутации, 'use server', первая строка requireUser()
lib/queries/<entity>.ts              — чтение (Server Components), без auth-проверки
types/database.ts                    — тип строки таблицы (синхронизировать вручную!)
types/domain.ts                      — доменный тип для UI (может отличаться от database.ts)
components/admin/<entity>/*Form.tsx  — форма редактирования в админке
components/<entity>/*.tsx            — публичный рендер (если сущность публичная)
```

**Эталон для копирования паттерна — `lib/actions/categories.ts` (112 строк,
самый маленький и полный: create/update/delete + загрузка изображения +
откат при ошибке). Не читать `works.ts` (432 строки) для этой цели — там та
же логика, но с доп. усложнением (цветовые варианты, specs).**

Общий контракт action-функции:
```ts
'use server';
export async function createX(_prev: ActionResult | null, formData: FormData): Promise<ActionResult>
```
`ActionResult = { success: boolean; message: string; id?: string }` определён
в `lib/actions/works.ts` и переиспользуется остальными через `import type`.

Каждый мутирующий action обязан:
1. Первой строкой — `requireUser()` из `lib/actions/auth-guard.ts`, обёрнутый
   в try/catch с `isUnauthorizedError`.
2. Валидировать через `safeParse` соответствующей zod-схемы.
3. При ошибке БД — оборачивать через `actionError()` из
   `lib/utils/action-error.ts` (даёт понятное сообщение вместо сырой ошибки
   Postgres).
4. В конце — `revalidatePath()` для всех затронутых публичных маршрутов.

## 3. Карта сущностей (проверено в коде)

| Сущность | validation | action | query | заметки |
|---|---|---|---|---|
| works | `work.schema.ts` | `works.ts` (432) | `works.ts` (340) | + цветовые варианты (group_id, is_primary), см. `0006_work_color_variants.sql` |
| categories | `work.schema.ts` (categorySchema) | `categories.ts` (112) | — | нет отдельного query-файла, читается инлайн там, где нужно |
| contact-requests | `contact.schema.ts` | `contact-requests.ts`, `contact.ts` | — | `contact.ts` — публичная форма (rate-limit, см. `lib/utils/rate-limit.ts`), `contact-requests.ts` — админский CRUD заявок |
| home_sections | `home-section.schema.ts` | `home-sections.ts` (140) | `home.ts` | контент — jsonb `content_json`, структура ПО ТИПУ СЕКЦИИ валидируется отдельно — см. §5 |
| settings | `settings.schema.ts` | `settings.ts` (224) | `site.ts` | singleton-таблица `site_settings` |
| auth | — | `auth.ts` | — | login/logout, один админ, регистрации через UI нет |

## 4. Миграции — порядок и что НЕ делать

```
0001_init.sql                 — база (таблицы, RLS, Storage). НЕ ЗАПУСКАТЬ ПОВТОРНО на существующей БД.
0002_redesign_fields.sql      — цена, картинка категории, динамическое меню
0003_ensure_menu_defaults.sql — дефолты меню (idempotent)
0004_sync_schema.sql          — синхронизация схемы
0005_backup_staging_bucket.sql — bucket для модуля backup
0006_work_color_variants.sql  — цветовые варианты работ (group_id, is_primary)
```

RLS-политики МОГУТ переопределяться в поздних миграциях — прежде чем
утверждать "у таблицы X такие права", проверить, нет ли изменений после
`0001` (сейчас переопределений RLS в `0002-0006` нет, но при добавлении
`0007` — проверять).

`types/database.ts` синхронизируется с миграциями ВРУЧНУЮ (codegen не
настроен). При любом ALTER TABLE — обновить этот файл в том же PR.

## 5. Ловушка: `content_json` (jsonb) в home_sections

Тип секции (Hero, Process, ContactCTA, ...) не типизирован на уровне БД.
Чтобы поменять состав полей секции, нужно синхронно поправить ТРИ места
(типы это не свяжут автоматически, проверять руками):
1. `lib/validations/home-section.schema.ts` — zod-схема для конкретного типа
2. `components/admin/home/*Editor.tsx` — форма редактирования
3. `components/home/*.tsx` — компонент рендера на публичном сайте

## 6. Известные осознанные ограничения (не "чинить" без запроса)

- Rate limit формы заявки — in-memory, не переживает разные serverless-
  инстансы Vercel. Задокументировано как компромисс, не баг.
- Лимит загрузки фото — 4MB (жёсткий лимит Vercel body 4.5MB, не настройка
  Next.js). Не поднимать через `bodySizeLimit` — не сработает в проде.
- Reorder фото — кнопки вверх/вниз, не drag-and-drop. Осознанный выбор.
- `service_role` клиент (`lib/supabase/admin.ts`) создан, но нигде не
  используется. Не подключать без явного запроса — все текущие мутации
  идут через RLS + сессию пользователя.

## 7. Как экономить токены при работе в этом репо

1. Не вызывать `view` на директории верхнего уровня "для разведки" — вся
   карта уже в §1-§3 этого файла.
2. Для новой похожей фичи — читать `categories.ts` как эталон паттерна
   (§2), не более крупные файлы той же роли.
3. Использовать `grep -rl "<entity>"` по `lib/` вместо обхода файлов —
   типичная фича = 4-6 файлов, они находятся мгновенно.
4. Правки в `content_json`-секциях — сразу открывать все 3 файла из §5,
   не искать их последовательно.
5. Если задача не про бэкапы/экспорт — не открывать `lib/backup/*`
   вообще (72K, изолировано намеренно).
