-- Trainer accounts + self-service portal
-- Run after coaches-trainers-structure.sql

alter table public.trainers
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists gym_hours_start time,
  add column if not exists gym_hours_end time;

create unique index if not exists trainers_user_id_unique_idx
  on public.trainers (user_id)
  where user_id is not null;

create or replace function public.is_trainer_self(p_trainer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trainers t
    where t.id = p_trainer_id and t.user_id = auth.uid()
  );
$$;

grant execute on function public.is_trainer_self(uuid) to authenticated;

drop policy if exists "trainers_select" on public.trainers;
create policy "trainers_select"
  on public.trainers for select to authenticated
  using (public.is_gym_owner(gym_id) or user_id = auth.uid());

drop policy if exists "trainers_update" on public.trainers;
create policy "trainers_update"
  on public.trainers for update to authenticated
  using (public.is_gym_owner(gym_id) or user_id = auth.uid())
  with check (public.is_gym_owner(gym_id) or user_id = auth.uid());

create or replace function public.get_trainer_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_trainer public.trainers;
  v_gym public.gyms;
  v_coach public.coaches;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_trainer
  from public.trainers t
  where t.user_id = auth.uid()
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_gym from public.gyms g where g.id = v_trainer.gym_id;
  select * into v_coach from public.coaches c where c.id = v_trainer.coach_id;

  return jsonb_build_object(
    'trainer', to_jsonb(v_trainer),
    'gym', to_jsonb(v_gym),
    'coach', to_jsonb(v_coach)
  );
end;
$$;

grant execute on function public.get_trainer_portal() to authenticated;

create or replace function public.register_gym_trainer(
  p_gym_slug text,
  p_coach_id uuid,
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
returns public.trainers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
  v_row public.trainers;
  v_end date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_gym from public.gyms g where g.slug = trim(p_gym_slug) limit 1;
  if not found then
    raise exception 'Gym not found';
  end if;

  if not exists (
    select 1 from public.coaches c where c.id = p_coach_id and c.gym_id = v_gym.id
  ) then
    raise exception 'Coach not found for this gym';
  end if;

  if exists (select 1 from public.trainers t where t.user_id = auth.uid()) then
    raise exception 'Trainer account already exists';
  end if;

  v_end := coalesce(p_contract_end_date, coalesce(p_contract_start_date, current_date) + 365);

  insert into public.trainers (
    gym_id,
    coach_id,
    user_id,
    first_name,
    last_name,
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
    p_coach_id,
    auth.uid(),
    trim(p_first_name),
    trim(p_last_name),
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

grant execute on function public.register_gym_trainer(
  text, uuid, text, text, text, text, text, text, time, time, date, date
) to authenticated;

create or replace function public.update_trainer_self(
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_specialty text default null,
  p_avatar_url text default null,
  p_gym_hours_start time default null,
  p_gym_hours_end time default null
)
returns public.trainers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.trainers;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.trainers
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    email = nullif(trim(coalesce(p_email, '')), ''),
    specialty = nullif(trim(coalesce(p_specialty, '')), ''),
    avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
    gym_hours_start = p_gym_hours_start,
    gym_hours_end = p_gym_hours_end
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Trainer profile not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_trainer_self(
  text, text, text, text, text, text, time, time
) to authenticated;

-- Public context for trainer self-signup (before auth)
create or replace function public.get_trainer_signup_context(p_gym_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
  v_coaches jsonb;
begin
  select * into v_gym from public.gyms g where g.slug = trim(p_gym_slug) limit 1;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb)
  into v_coaches
  from public.coaches c
  where c.gym_id = v_gym.id and c.active = true;

  return jsonb_build_object('gym', to_jsonb(v_gym), 'coaches', v_coaches);
end;
$$;

grant execute on function public.get_trainer_signup_context(text) to anon, authenticated;
