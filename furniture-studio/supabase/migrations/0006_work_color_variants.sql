-- Цветовые варианты товара: несколько записей works с одинаковым group_id
-- считаются одним товаром в разных цветах. У каждой — свои картинки
-- (work_images уже привязаны к work_id, менять не нужно).

alter table public.works add column if not exists group_id uuid;
alter table public.works add column if not exists color_name text;
alter table public.works add column if not exists color_hex text;
alter table public.works add column if not exists is_primary boolean not null default true;

-- Бэкофилл: у всех существующих товаров group_id = собственный id,
-- то есть каждый уже опубликованный товар — это группа из одного варианта.
update public.works set group_id = id where group_id is null;

-- Триггер подстраховывает: если при создании нового товара group_id не
-- передали явно (обычный товар без вариантов), он станет равен id самой
-- записи. Явно передавать group_id нужно только когда добавляем цвет
-- к уже существующему товару.
create or replace function public.works_set_group_id()
returns trigger as $$
begin
  if new.group_id is null then
    new.group_id := new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists works_set_group_id_trigger on public.works;
create trigger works_set_group_id_trigger
  before insert on public.works
  for each row execute function public.works_set_group_id();

alter table public.works alter column group_id set not null;

create index if not exists works_group_id_idx on public.works(group_id);
create index if not exists works_group_primary_idx on public.works(group_id, is_primary);

notify pgrst, 'reload schema';
