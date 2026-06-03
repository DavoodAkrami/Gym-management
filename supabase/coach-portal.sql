-- Coach accounts (login + self-service panel)
-- Run after coaches-trainers-structure.sql

alter table public.coaches
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists gym_hours_start time,
  add column if not exists gym_hours_end time;

create unique index if not exists coaches_user_id_unique_idx
  on public.coaches (user_id)
  where user_id is not null;

create or replace function public.is_coach_self(p_coach_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coaches c
    where c.id = p_coach_id and c.user_id = auth.uid()
  );
$$;

grant execute on function public.is_coach_self(uuid) to authenticated;

drop policy if exists "coaches_select" on public.coaches;
create policy "coaches_select"
  on public.coaches for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or user_id = auth.uid()
    or gym_id in (select gym_id from public.members where user_id = auth.uid())
  );

drop policy if exists "coaches_update" on public.coaches;
create policy "coaches_update"
  on public.coaches for update to authenticated
  using (public.is_gym_owner(gym_id) or user_id = auth.uid())
  with check (public.is_gym_owner(gym_id) or user_id = auth.uid());

create or replace function public.get_coach_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coach public.coaches;
  v_gym public.gyms;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_coach
  from public.coaches c
  where c.user_id = auth.uid()
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_gym from public.gyms g where g.id = v_coach.gym_id;

  return jsonb_build_object('coach', to_jsonb(v_coach), 'gym', to_jsonb(v_gym));
end;
$$;

grant execute on function public.get_coach_portal() to authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_gym from public.gyms g where g.slug = trim(p_gym_slug) limit 1;
  if not found then
    raise exception 'Gym not found';
  end if;

  if exists (select 1 from public.coaches c where c.user_id = auth.uid()) then
    raise exception 'Coach account already exists';
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

grant execute on function public.register_gym_coach_account(
  text, text, text, text, text, text, text, time, time, date, date
) to authenticated;

create or replace function public.update_coach_self(
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_specialty text default null,
  p_avatar_url text default null,
  p_gym_hours_start time default null,
  p_gym_hours_end time default null
)
returns public.coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.coaches;
  v_full_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_full_name := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));

  update public.coaches
  set
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    full_name = v_full_name,
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    email = nullif(trim(coalesce(p_email, '')), ''),
    specialty = nullif(trim(coalesce(p_specialty, '')), ''),
    avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
    gym_hours_start = p_gym_hours_start,
    gym_hours_end = p_gym_hours_end
  where user_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Coach profile not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.update_coach_self(
  text, text, text, text, text, text, time, time
) to authenticated;

create or replace function public.get_coach_signup_context(p_gym_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
begin
  select * into v_gym from public.gyms g where g.slug = trim(p_gym_slug) limit 1;
  if not found then
    return null;
  end if;

  return jsonb_build_object('gym', to_jsonb(v_gym));
end;
$$;

grant execute on function public.get_coach_signup_context(text) to anon, authenticated;
