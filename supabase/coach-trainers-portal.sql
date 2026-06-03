-- Coach login link, trainer assignment, coach overview
-- Run after coach-portal.sql and coaches-trainers-structure.sql

create or replace function public.current_coach_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.coaches c where c.user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_coach_id() to authenticated;

create or replace function public.is_active_coach_for_gym(p_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coaches c
    where c.gym_id = p_gym_id
      and c.user_id = auth.uid()
      and c.active = true
      and c.status = 'active'
  );
$$;

grant execute on function public.is_active_coach_for_gym(uuid) to authenticated;

-- Link auth user to an owner-created coach row (same email, no user yet)
create or replace function public.link_coach_account(p_gym_slug text default null)
returns public.coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_row public.coaches;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.coaches c where c.user_id = auth.uid()) then
    select * into v_row from public.coaches c where c.user_id = auth.uid() limit 1;
    return v_row;
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id = auth.uid();

  if v_email is null or v_email = '' then
    raise exception 'No email on account';
  end if;

  update public.coaches c
  set user_id = auth.uid()
  from public.gyms g
  where c.gym_id = g.id
    and c.user_id is null
    and c.active = true
    and c.status = 'active'
    and lower(trim(coalesce(c.email, ''))) = v_email
    and (p_gym_slug is null or g.slug = trim(p_gym_slug))
  returning c.* into v_row;

  if not found then
    raise exception 'No active coach profile found for this email. Ask your gym owner to add you, then sign in with the same email.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.link_coach_account(text) to authenticated;

-- Replace register: link existing coach in gym by email when possible
create or replace function public.register_gym_coach_account(
  p_gym_slug text,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_specialty text default null,
  p_avatar_url text default null,
  p_gym_hours_start time default null,
  p_gym_hours_end time default null,
  p_contract_start_date date default current_date,
  p_contract_end_date date default null
)
returns public.coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
  v_row public.coaches;
  v_full_name text;
  v_end date;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.coaches c where c.user_id = auth.uid()) then
    raise exception 'Coach account already linked';
  end if;

  select * into v_gym from public.gyms g where g.slug = trim(p_gym_slug) limit 1;
  if not found then
    raise exception 'Gym not found';
  end if;

  select lower(trim(coalesce(nullif(trim(p_email), ''), u.email))) into v_email
  from auth.users u
  where u.id = auth.uid();

  if v_email is not null and v_email <> '' then
    update public.coaches c
    set
      user_id = auth.uid(),
      first_name = coalesce(nullif(trim(p_first_name), ''), c.first_name),
      last_name = coalesce(nullif(trim(p_last_name), ''), c.last_name),
      full_name = trim(coalesce(nullif(trim(p_first_name), ''), c.first_name) || ' ' || coalesce(nullif(trim(p_last_name), ''), c.last_name)),
      phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), c.phone),
      email = coalesce(nullif(trim(coalesce(p_email, '')), ''), c.email),
      specialty = coalesce(nullif(trim(coalesce(p_specialty, '')), ''), c.specialty),
      avatar_url = coalesce(nullif(trim(coalesce(p_avatar_url, '')), ''), c.avatar_url),
      gym_hours_start = coalesce(p_gym_hours_start, c.gym_hours_start),
      gym_hours_end = coalesce(p_gym_hours_end, c.gym_hours_end)
    where c.gym_id = v_gym.id
      and c.user_id is null
      and c.active = true
      and c.status = 'active'
      and lower(trim(coalesce(c.email, ''))) = v_email
    returning * into v_row;

    if found then
      return v_row;
    end if;
  end if;

  v_full_name := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));
  if v_full_name = '' then
    raise exception 'First and last name are required';
  end if;

  v_end := coalesce(p_contract_end_date, coalesce(p_contract_start_date, current_date) + 365);

  insert into public.coaches (
    gym_id,
    user_id,
    first_name,
    last_name,
    full_name,
    phone,
    email,
    specialty,
    avatar_url,
    gym_hours_start,
    gym_hours_end,
    contract_start_date,
    contract_end_date,
    active,
    status
  )
  values (
    v_gym.id,
    auth.uid(),
    trim(p_first_name),
    trim(p_last_name),
    v_full_name,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_specialty, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    p_gym_hours_start,
    p_gym_hours_end,
    coalesce(p_contract_start_date, current_date),
    v_end,
    true,
    'active'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.get_coach_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_trainer_count int;
  v_earnings numeric;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found then
    return null;
  end if;

  select
    count(*)::int,
    coalesce(sum(t.salary), 0)
  into v_trainer_count, v_earnings
  from public.trainers t
  where t.coach_id = v_coach.id
    and t.gym_id = v_coach.gym_id
    and t.active = true
    and t.status = 'active';

  return jsonb_build_object(
    'trainer_count', v_trainer_count,
    'earnings_from_trainers', v_earnings,
    'currency_gym_id', v_coach.gym_id
  );
end;
$$;

grant execute on function public.get_coach_overview() to authenticated;

create or replace function public.get_coach_assignable_trainers()
returns setof public.trainers
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found then
    return;
  end if;

  if not v_coach.active or v_coach.status <> 'active' then
    return;
  end if;

  return query
  select t.*
  from public.trainers t
  where t.gym_id = v_coach.gym_id
    and t.active = true
    and t.status = 'active'
    and t.coach_id <> v_coach.id
  order by t.first_name, t.last_name;
end;
$$;

grant execute on function public.get_coach_assignable_trainers() to authenticated;

create or replace function public.coach_assign_trainer(p_trainer_id uuid)
returns public.trainers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_trainer public.trainers;
begin
  select * into v_coach from public.coaches c where c.user_id = auth.uid() limit 1;
  if not found then
    raise exception 'Coach profile not found';
  end if;

  if not v_coach.active or v_coach.status <> 'active' then
    raise exception 'Your coach profile must be active in this gym';
  end if;

  select * into v_trainer
  from public.trainers t
  where t.id = p_trainer_id
    and t.gym_id = v_coach.gym_id
  for update;

  if not found then
    raise exception 'Trainer not found in your gym';
  end if;

  if not v_trainer.active or v_trainer.status <> 'active' then
    raise exception 'Only active trainers can be assigned to you';
  end if;

  if v_trainer.coach_id = v_coach.id then
    return v_trainer;
  end if;

  update public.trainers
  set coach_id = v_coach.id
  where id = p_trainer_id
  returning * into v_trainer;

  return v_trainer;
end;
$$;

grant execute on function public.coach_assign_trainer(uuid) to authenticated;

-- Trainers: coaches can read gym trainers and update assignment to self
drop policy if exists "trainers_select" on public.trainers;
create policy "trainers_select"
  on public.trainers for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or public.is_active_coach_for_gym(gym_id)
  );

drop policy if exists "trainers_update" on public.trainers;
create policy "trainers_update"
  on public.trainers for update to authenticated
  using (
    public.is_gym_owner(gym_id)
    or public.is_active_coach_for_gym(gym_id)
  )
  with check (
    public.is_gym_owner(gym_id)
    or (
      public.is_active_coach_for_gym(gym_id)
      and coach_id = public.current_coach_id()
    )
  );
