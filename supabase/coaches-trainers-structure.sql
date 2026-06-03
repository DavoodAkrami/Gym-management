-- Coaches (supervisors) + Trainers (staff under a coach) with avatars & permissions
-- Run in Supabase SQL Editor after schema.sql and fix-*-rls.sql

-- ─── Extend head coaches table ───────────────────────────────────────────────
alter table public.coaches
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists permissions jsonb not null default '{
    "manage_trainers": true,
    "view_members": true,
    "edit_members": false,
    "view_attendance": true,
    "record_attendance": true
  }'::jsonb,
  add column if not exists contract_start_date date default current_date,
  add column if not exists contract_end_date date,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'on_leave'));

-- Backfill names from legacy full_name
update public.coaches
set
  first_name = coalesce(
    nullif(trim(split_part(full_name, ' ', 1)), ''),
    full_name
  ),
  last_name = coalesce(
    nullif(trim(substring(full_name from position(' ' in full_name) + 1)), ''),
    ''
  )
where first_name is null or first_name = '';

alter table public.coaches
  alter column first_name set default '',
  alter column last_name set default '';

update public.coaches set first_name = '' where first_name is null;
update public.coaches set last_name = '' where last_name is null;

alter table public.coaches
  alter column first_name set not null,
  alter column last_name set not null;

-- Default contract end: 1 year from start for existing rows
update public.coaches
set contract_end_date = coalesce(contract_end_date, coalesce(contract_start_date, current_date) + 365)
where contract_end_date is null;

-- ─── Trainers (each trainer belongs to one coach) ────────────────────────────
create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete restrict,
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  specialty text,
  avatar_url text,
  contract_start_date date not null default current_date,
  contract_end_date date not null,
  salary numeric(12, 2),
  active boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave')),
  created_at timestamptz not null default now()
);

create index if not exists trainers_gym_id_idx on public.trainers (gym_id);
create index if not exists trainers_coach_id_idx on public.trainers (coach_id);

-- Migrate legacy coach rows that were really individual trainers:
-- For each gym, ensure at least one head coach, then attach legacy-only rows as trainers.
do $$
declare
  r record;
  v_head_coach_id uuid;
begin
  for r in
    select distinct gym_id from public.coaches
  loop
    select id into v_head_coach_id
    from public.coaches c
    where c.gym_id = r.gym_id
    order by c.created_at asc
    limit 1;

    if v_head_coach_id is null then
      continue;
    end if;

    -- If multiple legacy coach rows existed, move extras to trainers under the first head coach
    insert into public.trainers (
      gym_id,
      coach_id,
      first_name,
      last_name,
      phone,
      specialty,
      salary,
      active,
      contract_start_date,
      contract_end_date
    )
    select
      c.gym_id,
      v_head_coach_id,
      c.first_name,
      c.last_name,
      c.phone,
      c.specialty,
      c.salary,
      c.active,
      coalesce(c.contract_start_date, current_date),
      coalesce(c.contract_end_date, current_date + 365)
    from public.coaches c
    where c.gym_id = r.gym_id
      and c.id <> v_head_coach_id
      and not exists (
        select 1 from public.trainers t
        where t.gym_id = c.gym_id
          and t.first_name = c.first_name
          and t.last_name = c.last_name
      );
  end loop;
end;
$$;

-- ─── Member ↔ Trainer assignments (replaces member ↔ coach) ─────────────────
create table if not exists public.member_trainers (
  member_id uuid not null references public.members (id) on delete cascade,
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  primary key (member_id, trainer_id)
);

-- Copy existing member_coaches links when possible (coach id → trainer id by gym+name match)
insert into public.member_trainers (member_id, trainer_id)
select distinct mc.member_id, t.id
from public.member_coaches mc
join public.coaches c on c.id = mc.coach_id
join public.trainers t on t.gym_id = c.gym_id
  and t.first_name = c.first_name
  and t.last_name = c.last_name
on conflict do nothing;

-- Optional: drop old junction after verifying migration
-- drop table if exists public.member_coaches;

alter table public.trainers enable row level security;

drop policy if exists "trainers_all" on public.trainers;
create policy "trainers_select"
  on public.trainers for select to authenticated
  using (public.is_gym_owner(gym_id));

create policy "trainers_insert"
  on public.trainers for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "trainers_update"
  on public.trainers for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create policy "trainers_delete"
  on public.trainers for delete to authenticated
  using (public.is_gym_owner(gym_id));

alter table public.member_trainers enable row level security;

drop policy if exists "member_trainers_all" on public.member_trainers;
create policy "member_trainers_all"
  on public.member_trainers for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_trainers.member_id and public.is_gym_owner(m.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_trainers.member_id and public.is_gym_owner(m.gym_id)
    )
  );

-- Helper: coach belongs to owner's gym
create or replace function public.is_gym_coach(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coaches c
    where c.id = p_coach_id and public.is_gym_owner(c.gym_id)
  );
$$;

grant execute on function public.is_gym_coach(uuid) to authenticated;
