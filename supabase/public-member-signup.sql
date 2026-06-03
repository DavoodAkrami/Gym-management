-- Public member signup via QR/link + member portal access
-- Run in Supabase SQL Editor after schema.sql and fix-*-rls.sql

alter table public.members
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists members_gym_user_id_idx
  on public.members (gym_id, user_id)
  where user_id is not null;

-- Only create owner profiles (skip gym members)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'role', 'owner') = 'member' then
    return new;
  end if;

  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name);

  return new;
end;
$$;

-- Public: validate token and return gym + plans (no secrets)
create or replace function public.get_signup_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.signup_links;
  v_gym public.gyms;
  v_plans jsonb;
begin
  if nullif(trim(p_token), '') is null then
    raise exception 'Invalid signup link';
  end if;

  select * into v_link
  from public.signup_links sl
  where sl.token = trim(p_token) and sl.active = true
  limit 1;

  if not found then
    raise exception 'Signup link is invalid or expired';
  end if;

  select * into v_gym from public.gyms g where g.id = v_link.gym_id;

  if not found then
    raise exception 'Gym not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gp.id,
        'name', gp.name,
        'price', gp.price,
        'duration_days', gp.duration_days
      )
      order by gp.price asc
    ),
    '[]'::jsonb
  )
  into v_plans
  from public.gym_plans gp
  where gp.gym_id = v_gym.id;

  if v_plans = '[]'::jsonb then
    raise exception 'This gym has no membership plans yet';
  end if;

  return jsonb_build_object(
    'gym', jsonb_build_object(
      'id', v_gym.id,
      'name', v_gym.name,
      'address', v_gym.address,
      'phone', v_gym.phone,
      'base_currency', v_gym.base_currency
    ),
    'plans', v_plans
  );
end;
$$;

revoke all on function public.get_signup_context(text) from public;
grant execute on function public.get_signup_context(text) to anon, authenticated;

-- Authenticated member: register via active signup link
create or replace function public.register_member_via_signup_link(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_plan_id uuid,
  p_zip_code text default null,
  p_national_id text default null,
  p_preferred_language text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.signup_links;
  v_member public.members;
  v_membership public.memberships;
  v_plan public.gym_plans;
  v_end_date date;
begin
  if auth.uid() is null then
    raise exception 'Sign in required to complete registration';
  end if;

  if nullif(trim(p_token), '') is null then
    raise exception 'Invalid signup link';
  end if;

  if p_plan_id is null then
    raise exception 'Please select a membership plan';
  end if;

  select * into v_link
  from public.signup_links sl
  where sl.token = trim(p_token) and sl.active = true
  limit 1;

  if not found then
    raise exception 'Signup link is invalid or expired';
  end if;

  if exists (
    select 1 from public.members m
    where m.gym_id = v_link.gym_id and m.user_id = auth.uid()
  ) then
    raise exception 'You are already registered at this gym';
  end if;

  if exists (
    select 1 from public.members m
    where m.gym_id = v_link.gym_id and m.phone = trim(p_phone)
  ) then
    raise exception 'This phone number is already registered at this gym';
  end if;

  select * into v_plan
  from public.gym_plans gp
  where gp.id = p_plan_id and gp.gym_id = v_link.gym_id;

  if not found then
    raise exception 'Plan not found for this gym';
  end if;

  insert into public.members (
    gym_id,
    user_id,
    first_name,
    last_name,
    phone,
    zip_code,
    national_id,
    preferred_language,
    status,
    join_date
  )
  values (
    v_link.gym_id,
    auth.uid(),
    trim(p_first_name),
    trim(p_last_name),
    trim(p_phone),
    nullif(trim(coalesce(p_zip_code, '')), ''),
    nullif(trim(coalesce(p_national_id, '')), ''),
    coalesce(p_preferred_language, 'en'),
    'active',
    current_date
  )
  returning * into v_member;

  v_end_date := current_date + v_plan.duration_days;

  insert into public.memberships (
    gym_id,
    member_id,
    plan_id,
    start_date,
    end_date,
    price,
    status
  )
  values (
    v_link.gym_id,
    v_member.id,
    v_plan.id,
    current_date,
    v_end_date,
    v_plan.price,
    'active'
  )
  returning * into v_membership;

  return jsonb_build_object(
    'member', to_jsonb(v_member),
    'membership', to_jsonb(v_membership),
    'plan_name', v_plan.name
  );
end;
$$;

revoke all on function public.register_member_via_signup_link(text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.register_member_via_signup_link(text, text, text, text, uuid, text, text, text) to authenticated;

-- Member portal dashboard
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
    select gp.name into v_plan_name
    from public.gym_plans gp
    where gp.id = v_membership.plan_id;

    v_days_left := (v_membership.end_date - current_date);
  end if;

  return jsonb_build_object(
    'member', to_jsonb(v_member),
    'gym', to_jsonb(v_gym),
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

revoke all on function public.get_member_portal() from public;
grant execute on function public.get_member_portal() to authenticated;

-- Member read own row (optional direct queries)
drop policy if exists "members_select_own" on public.members;
create policy "members_select_own"
  on public.members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own"
  on public.memberships for select to authenticated
  using (
    member_id in (select id from public.members where user_id = auth.uid())
  );

drop policy if exists "gyms_select_member" on public.gyms;
create policy "gyms_select_member"
  on public.gyms for select to authenticated
  using (
    id in (select gym_id from public.members where user_id = auth.uid())
  );

drop policy if exists "gym_plans_select_member" on public.gym_plans;
create policy "gym_plans_select_member"
  on public.gym_plans for select to authenticated
  using (
    gym_id in (select gym_id from public.members where user_id = auth.uid())
  );
