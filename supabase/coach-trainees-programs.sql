-- شاگرد (trainees) = members linked to a coach via member_coaches
-- Coach programs = per-trainer plans members can join
-- Run after coach-portal.sql and public-member-signup.sql

alter table public.members
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists avatar_url text;

-- ─── Coach programs ─────────────────────────────────────────────────────────
create table if not exists public.coach_programs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  duration_days int not null check (duration_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists coach_programs_coach_id_idx on public.coach_programs (coach_id);
create index if not exists coach_programs_gym_id_idx on public.coach_programs (gym_id);

create table if not exists public.member_coach_enrollments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  program_id uuid not null references public.coach_programs (id) on delete restrict,
  start_date date not null default current_date,
  end_date date not null,
  price numeric(12, 2) not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists member_coach_enrollments_coach_idx
  on public.member_coach_enrollments (coach_id);
create index if not exists member_coach_enrollments_member_idx
  on public.member_coach_enrollments (member_id);

alter table public.coach_programs enable row level security;
alter table public.member_coach_enrollments enable row level security;

-- ─── member_coaches: owner, coach (trainees), member ────────────────────────
drop policy if exists "member_coaches_all" on public.member_coaches;
drop policy if exists "member_coaches_owner" on public.member_coaches;
drop policy if exists "member_coaches_coach_select" on public.member_coaches;
drop policy if exists "member_coaches_coach_write" on public.member_coaches;
drop policy if exists "member_coaches_coach_delete" on public.member_coaches;
drop policy if exists "member_coaches_member_insert" on public.member_coaches;
drop policy if exists "member_coaches_member_delete" on public.member_coaches;

create policy "member_coaches_owner"
  on public.member_coaches for all to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = member_coaches.member_id and public.is_gym_owner(m.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = member_coaches.member_id and public.is_gym_owner(m.gym_id)
    )
  );

create policy "member_coaches_coach_select"
  on public.member_coaches for select to authenticated
  using (
    coach_id = public.current_coach_id()
    or exists (
      select 1 from public.members m
      where m.id = member_coaches.member_id and m.user_id = auth.uid()
    )
  );

create policy "member_coaches_coach_write"
  on public.member_coaches for insert to authenticated
  with check (
    coach_id = public.current_coach_id()
    and public.is_active_coach_for_gym(
      (select c.gym_id from public.coaches c where c.id = coach_id)
    )
  );

create policy "member_coaches_coach_delete"
  on public.member_coaches for delete to authenticated
  using (coach_id = public.current_coach_id());

create policy "member_coaches_member_insert"
  on public.member_coaches for insert to authenticated
  with check (
    member_id in (select id from public.members where user_id = auth.uid())
  );

create policy "member_coaches_member_delete"
  on public.member_coaches for delete to authenticated
  using (
    member_id in (select id from public.members where user_id = auth.uid())
  );

-- Members: self update (profile + avatar)
drop policy if exists "members_update_own" on public.members;
create policy "members_update_own"
  on public.members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Coaches visible to owners, linked coaches, and members in the same gym
drop policy if exists "coaches_select_member_gym" on public.coaches;
drop policy if exists "coaches_select" on public.coaches;
create policy "coaches_select"
  on public.coaches for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or user_id = auth.uid()
    or gym_id in (select gym_id from public.members where user_id = auth.uid())
  );

-- Coach programs RLS
drop policy if exists "coach_programs_select" on public.coach_programs;
drop policy if exists "coach_programs_coach_write" on public.coach_programs;
drop policy if exists "coach_programs_owner" on public.coach_programs;

create policy "coach_programs_select"
  on public.coach_programs for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or coach_id = public.current_coach_id()
    or gym_id in (select gym_id from public.members where user_id = auth.uid())
  );

create policy "coach_programs_coach_write"
  on public.coach_programs for all to authenticated
  using (coach_id = public.current_coach_id())
  with check (coach_id = public.current_coach_id());

create policy "coach_programs_owner"
  on public.coach_programs for all to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

-- Enrollments RLS
drop policy if exists "enrollments_select" on public.member_coach_enrollments;
drop policy if exists "enrollments_member_insert" on public.member_coach_enrollments;
drop policy if exists "enrollments_coach_insert" on public.member_coach_enrollments;

create policy "enrollments_select"
  on public.member_coach_enrollments for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or coach_id = public.current_coach_id()
    or member_id in (select id from public.members where user_id = auth.uid())
  );

create policy "enrollments_member_insert"
  on public.member_coach_enrollments for insert to authenticated
  with check (
    member_id in (select id from public.members where user_id = auth.uid())
  );

create policy "enrollments_coach_insert"
  on public.member_coach_enrollments for insert to authenticated
  with check (coach_id = public.current_coach_id());

-- ─── Coach overview (شاگرد count + program earnings) ────────────────────────
create or replace function public.get_coach_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_trainee_count int;
  v_earnings numeric;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found then
    return null;
  end if;

  select count(*)::int into v_trainee_count
  from public.member_coaches mc
  join public.members m on m.id = mc.member_id
  where mc.coach_id = v_coach.id
    and m.status = 'active';

  select coalesce(sum(e.price), 0) into v_earnings
  from public.member_coach_enrollments e
  where e.coach_id = v_coach.id
    and e.status = 'active';

  return jsonb_build_object(
    'trainee_count', v_trainee_count,
    'earnings_from_trainees', v_earnings
  );
end;
$$;

create or replace function public.get_coach_trainee_series(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  select c.id into v_coach_id from public.coaches c where c.user_id = auth.uid() limit 1;
  if v_coach_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('label', to_char(d.day, 'Mon DD'), 'value', d.cnt) order by d.day)
    from (
      select m.join_date as day, count(*)::int as cnt
      from public.member_coaches mc
      join public.members m on m.id = mc.member_id
      where mc.coach_id = v_coach_id
        and m.join_date >= current_date - (p_days - 1)
      group by m.join_date
    ) d
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_coach_earnings_series(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  select c.id into v_coach_id from public.coaches c where c.user_id = auth.uid() limit 1;
  if v_coach_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('label', to_char(d.day, 'Mon DD'), 'value', d.total) order by d.day)
    from (
      select
        e.created_at::date as day,
        sum(e.price) as total
      from public.member_coach_enrollments e
      where e.coach_id = v_coach_id
        and e.created_at >= (current_timestamp - (p_days || ' days')::interval)
      group by e.created_at::date
    ) d
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_coach_overview() to authenticated;
grant execute on function public.get_coach_trainee_series(int) to authenticated;
grant execute on function public.get_coach_earnings_series(int) to authenticated;

-- ─── شاگرد list / assign ────────────────────────────────────────────────────
create or replace function public.get_coach_trainees()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  select c.id into v_coach_id from public.coaches c where c.user_id = auth.uid() limit 1;
  if v_coach_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'member_id', m.id,
        'first_name', m.first_name,
        'last_name', m.last_name,
        'full_name', trim(m.first_name || ' ' || m.last_name),
        'phone', m.phone,
        'avatar_url', m.avatar_url,
        'status', m.status,
        'join_date', m.join_date
      )
      order by m.first_name, m.last_name
    )
    from public.member_coaches mc
    join public.members m on m.id = mc.member_id
    where mc.coach_id = v_coach_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_coach_assignable_members()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found or not v_coach.active or v_coach.status <> 'active' then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'member_id', m.id,
        'full_name', trim(m.first_name || ' ' || m.last_name),
        'phone', m.phone
      )
      order by m.first_name
    )
    from public.members m
    where m.gym_id = v_coach.gym_id
      and m.status = 'active'
      and exists (
        select 1 from public.memberships ms
        where ms.member_id = m.id and ms.status = 'active' and ms.end_date >= current_date
      )
      and not exists (
        select 1 from public.member_coaches mc
        where mc.member_id = m.id and mc.coach_id = v_coach.id
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.coach_add_trainee(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_member public.members;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found or not v_coach.active or v_coach.status <> 'active' then
    raise exception 'Coach must be active';
  end if;

  select * into v_member from public.members m where m.id = p_member_id and m.gym_id = v_coach.gym_id;
  if not found or v_member.status <> 'active' then
    raise exception 'Member not found or not active in your gym';
  end if;

  if not exists (
    select 1 from public.memberships ms
    where ms.member_id = p_member_id and ms.status = 'active' and ms.end_date >= current_date
  ) then
    raise exception 'Member needs an active gym membership';
  end if;

  insert into public.member_coaches (member_id, coach_id)
  values (p_member_id, v_coach.id)
  on conflict do nothing;
end;
$$;

create or replace function public.coach_remove_trainee(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  select c.id into v_coach_id from public.coaches c where c.user_id = auth.uid() limit 1;
  delete from public.member_coaches mc
  where mc.coach_id = v_coach_id and mc.member_id = p_member_id;
end;
$$;

grant execute on function public.get_coach_trainees() to authenticated;
grant execute on function public.get_coach_assignable_members() to authenticated;
grant execute on function public.coach_add_trainee(uuid) to authenticated;
grant execute on function public.coach_remove_trainee(uuid) to authenticated;

-- ─── Member: pick coach + programs ────────────────────────────────────────────
create or replace function public.get_gym_coaches_for_member()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
begin
  select m.gym_id into v_gym_id from public.members m where m.user_id = auth.uid() limit 1;
  if v_gym_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_data order by sort_name)
    from (
      select
        coalesce(nullif(trim(c.full_name), ''), trim(c.first_name || ' ' || c.last_name)) as sort_name,
        jsonb_build_object(
          'id', c.id,
          'full_name', coalesce(nullif(trim(c.full_name), ''), trim(c.first_name || ' ' || c.last_name)),
          'specialty', c.specialty,
          'avatar_url', c.avatar_url,
          'is_mine', exists (
            select 1 from public.member_coaches mc
            join public.members m on m.id = mc.member_id
            where mc.coach_id = c.id and m.user_id = auth.uid()
          )
        ) as row_data
      from public.coaches c
      where c.gym_id = v_gym_id
        and coalesce(c.active, true) = true
    ) sub
  ), '[]'::jsonb);
end;
$$;

create or replace function public.member_choose_coach_with_program(
  p_coach_id uuid,
  p_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_coach public.coaches;
  v_program public.coach_programs;
begin
  select * into v_member from public.members m where m.user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Member not found';
  end if;

  select * into v_coach from public.coaches c
  where c.id = p_coach_id
    and c.gym_id = v_member.gym_id
    and c.active = true
    and coalesce(c.status, 'active') = 'active';
  if not found then
    raise exception 'Coach not available in your gym';
  end if;

  select * into v_program from public.coach_programs cp
  where cp.id = p_program_id
    and cp.coach_id = p_coach_id
    and cp.gym_id = v_member.gym_id
    and cp.active = true;
  if not found then
    raise exception 'Program not found for this coach';
  end if;

  delete from public.member_coaches mc where mc.member_id = v_member.id;

  insert into public.member_coaches (member_id, coach_id)
  values (v_member.id, p_coach_id);

  insert into public.member_coach_enrollments (
    gym_id, member_id, coach_id, program_id, start_date, end_date, price, status
  )
  values (
    v_member.gym_id,
    v_member.id,
    p_coach_id,
    v_program.id,
    current_date,
    current_date + v_program.duration_days,
    v_program.price,
    'active'
  );
end;
$$;

create or replace function public.member_choose_coach(p_coach_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_coach public.coaches;
begin
  select * into v_member from public.members m where m.user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Member not found';
  end if;

  select * into v_coach from public.coaches c
  where c.id = p_coach_id and c.gym_id = v_member.gym_id
    and c.active = true and c.status = 'active';
  if not found then
    raise exception 'Coach not available in your gym';
  end if;

  delete from public.member_coaches mc
  where mc.member_id = v_member.id;

  insert into public.member_coaches (member_id, coach_id)
  values (v_member.id, p_coach_id);
end;
$$;

grant execute on function public.get_gym_coaches_for_member() to authenticated;
grant execute on function public.member_choose_coach(uuid) to authenticated;
grant execute on function public.member_choose_coach_with_program(uuid, uuid) to authenticated;

-- ─── Coach programs CRUD + member join ──────────────────────────────────────
create or replace function public.get_coach_programs(p_coach_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
begin
  v_coach_id := coalesce(
    p_coach_id,
    (select c.id from public.coaches c where c.user_id = auth.uid() limit 1)
  );

  if v_coach_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(cp) order by cp.created_at desc)
    from public.coach_programs cp
    where cp.coach_id = v_coach_id and cp.active = true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.coach_upsert_program(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_duration_days int
)
returns public.coach_programs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_row public.coach_programs;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Coach not found';
  end if;

  if p_id is null then
    insert into public.coach_programs (gym_id, coach_id, name, description, price, duration_days)
    values (v_coach.gym_id, v_coach.id, trim(p_name), coalesce(p_description, ''), p_price, p_duration_days)
    returning * into v_row;
  else
    update public.coach_programs
    set
      name = trim(p_name),
      description = coalesce(p_description, ''),
      price = p_price,
      duration_days = p_duration_days
    where id = p_id and coach_id = v_coach.id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.member_join_coach_program(p_program_id uuid)
returns public.member_coach_enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_program public.coach_programs;
  v_row public.member_coach_enrollments;
begin
  select * into v_member from public.members m where m.user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Member not found';
  end if;

  select * into v_program from public.coach_programs cp
  where cp.id = p_program_id and cp.active = true and cp.gym_id = v_member.gym_id;
  if not found then
    raise exception 'Program not found';
  end if;

  insert into public.member_coaches (member_id, coach_id)
  values (v_member.id, v_program.coach_id)
  on conflict do nothing;

  insert into public.member_coach_enrollments (
    gym_id, member_id, coach_id, program_id, start_date, end_date, price, status
  )
  values (
    v_member.gym_id,
    v_member.id,
    v_program.coach_id,
    v_program.id,
    current_date,
    current_date + v_program.duration_days,
    v_program.price,
    'active'
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.get_coach_programs(uuid) to authenticated;
grant execute on function public.coach_upsert_program(uuid, text, text, numeric, int) to authenticated;
grant execute on function public.member_join_coach_program(uuid) to authenticated;

-- ─── Profile updates ────────────────────────────────────────────────────────
create or replace function public.update_member_self(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_avatar_url text default null
)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.members;
begin
  update public.members
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    phone = trim(p_phone),
    avatar_url = nullif(trim(coalesce(p_avatar_url, '')), '')
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Member not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.update_owner_profile(
  p_full_name text,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
begin
  update public.profiles
  set
    full_name = trim(p_full_name),
    avatar_url = nullif(trim(coalesce(p_avatar_url, '')), '')
  where id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Profile not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_member_self(text, text, text, text) to authenticated;
grant execute on function public.update_owner_profile(text, text) to authenticated;

-- Extend member portal payload
create or replace function public.get_member_portal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_gym public.gyms;
  v_membership public.memberships;
  v_plan_name text;
  v_days_left int;
  v_has_membership boolean := false;
  v_coach jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select m.* into v_member
  from public.members m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_gym from public.gyms g where g.id = v_member.gym_id;

  select ms.* into v_membership
  from public.memberships ms
  where ms.member_id = v_member.id
  order by ms.end_date desc
  limit 1;

  v_has_membership := found;

  if v_has_membership then
    select gp.name into v_plan_name from public.gym_plans gp where gp.id = v_membership.plan_id;
    v_days_left := (v_membership.end_date - current_date);
  end if;

  select jsonb_build_object(
    'id', c.id,
    'full_name', coalesce(nullif(trim(c.full_name), ''), trim(c.first_name || ' ' || c.last_name)),
    'specialty', c.specialty,
    'avatar_url', c.avatar_url
  ) into v_coach
  from public.member_coaches mc
  join public.coaches c on c.id = mc.coach_id
  where mc.member_id = v_member.id
  limit 1;

  return jsonb_build_object(
    'member', to_jsonb(v_member),
    'gym', to_jsonb(v_gym),
    'coach', v_coach,
    'available_coaches', coalesce(public.get_gym_coaches_for_member(), '[]'::jsonb),
    'membership', case
      when not v_has_membership then null
      else jsonb_build_object(
        'id', v_membership.id,
        'plan_id', v_membership.plan_id,
        'plan_name', v_plan_name,
        'start_date', v_membership.start_date,
        'end_date', v_membership.end_date,
        'price', v_membership.price,
        'status', v_membership.status,
        'days_left', v_days_left
      )
    end
  );
end;
$$;
