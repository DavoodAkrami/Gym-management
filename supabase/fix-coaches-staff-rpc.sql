-- Run after coaches-trainers-structure.sql (or if coach insert fails)
-- Creates RPCs so owner can add coaches/trainers reliably

create or replace function public.create_gym_coach(
  p_gym_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_specialty text default null,
  p_avatar_url text default null,
  p_permissions jsonb default null,
  p_contract_start_date date default current_date,
  p_contract_end_date date default null,
  p_salary numeric default null,
  p_active boolean default true,
  p_status text default 'active'
)
returns public.coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.coaches;
  v_full_name text;
  v_end date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_gym_owner(p_gym_id) then
    raise exception 'Not allowed for this gym';
  end if;

  v_full_name := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));
  if v_full_name = '' then
    raise exception 'First and last name are required';
  end if;

  v_end := coalesce(p_contract_end_date, coalesce(p_contract_start_date, current_date) + 365);

  insert into public.coaches (
    gym_id,
    first_name,
    last_name,
    full_name,
    phone,
    email,
    specialty,
    avatar_url,
    permissions,
    contract_start_date,
    contract_end_date,
    salary,
    active,
    status
  )
  values (
    p_gym_id,
    trim(p_first_name),
    trim(p_last_name),
    v_full_name,
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_specialty, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    coalesce(p_permissions, '{
      "manage_trainers": true,
      "view_members": true,
      "edit_members": false,
      "view_attendance": true,
      "record_attendance": true
    }'::jsonb),
    coalesce(p_contract_start_date, current_date),
    v_end,
    p_salary,
    coalesce(p_active, true),
    coalesce(p_status, 'active')
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_gym_trainer(
  p_gym_id uuid,
  p_coach_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_specialty text default null,
  p_avatar_url text default null,
  p_contract_start_date date default current_date,
  p_contract_end_date date default null,
  p_salary numeric default null,
  p_active boolean default true,
  p_status text default 'active'
)
returns public.trainers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.trainers;
  v_end date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_gym_owner(p_gym_id) then
    raise exception 'Not allowed for this gym';
  end if;
  if not exists (
    select 1 from public.coaches c where c.id = p_coach_id and c.gym_id = p_gym_id
  ) then
    raise exception 'Coach not found for this gym';
  end if;

  v_end := coalesce(p_contract_end_date, coalesce(p_contract_start_date, current_date) + 365);

  insert into public.trainers (
    gym_id,
    coach_id,
    first_name,
    last_name,
    phone,
    email,
    specialty,
    avatar_url,
    contract_start_date,
    contract_end_date,
    salary,
    active,
    status
  )
  values (
    p_gym_id,
    p_coach_id,
    trim(p_first_name),
    trim(p_last_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_specialty, '')), ''),
    nullif(trim(coalesce(p_avatar_url, '')), ''),
    coalesce(p_contract_start_date, current_date),
    v_end,
    p_salary,
    coalesce(p_active, true),
    coalesce(p_status, 'active')
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_gym_coach(uuid, text, text, text, text, text, text, jsonb, date, date, numeric, boolean, text) from public;
grant execute on function public.create_gym_coach(uuid, text, text, text, text, text, text, jsonb, date, date, numeric, boolean, text) to authenticated;

revoke all on function public.create_gym_trainer(uuid, uuid, text, text, text, text, text, text, date, date, numeric, boolean, text) from public;
grant execute on function public.create_gym_trainer(uuid, uuid, text, text, text, text, text, text, date, date, numeric, boolean, text) to authenticated;

-- Restore owner access on coaches if policies were changed
drop policy if exists "coaches_all" on public.coaches;
create policy "coaches_all"
  on public.coaches for all to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));
