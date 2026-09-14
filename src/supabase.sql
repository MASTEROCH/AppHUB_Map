-- AppHub · карта экосистемы — общая база для совместной правки (Supabase).
-- Выполнить один раз в SQL Editor нового проекта, затем вписать url + anon-ключ в src/data.js → APPHUB_SYNC.
-- Прежний проект (bsebatbejrhiabgsjhax) недоступен с сентября 2026 (NXDOMAIN).

create table if not exists public.apphub_map (
  id          text primary key,           -- 'main' = карта v1, 'v2' = карта v2
  data        jsonb not null,             -- {nodes, links, zones}
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.apphub_map enable row level security;

-- читать карту может любой (клиенты открывают витрину без ключа)
drop policy if exists apphub_map_read on public.apphub_map;
create policy apphub_map_read on public.apphub_map
  for select to anon, authenticated using (true);

-- писать anon-ключом можно только в известные строки карты (v1 и v2); секрет редактора — ?key= в URL
drop policy if exists apphub_map_write on public.apphub_map;
create policy apphub_map_write on public.apphub_map
  for insert to anon, authenticated with check (id in ('main','v2'));

drop policy if exists apphub_map_update on public.apphub_map;
create policy apphub_map_update on public.apphub_map
  for update to anon, authenticated using (id in ('main','v2')) with check (id in ('main','v2'));
