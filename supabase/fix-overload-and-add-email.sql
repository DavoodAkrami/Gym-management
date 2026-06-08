-- 1. Add email column
alter table public.members add column if not exists email text;

-- 2. Drop ALL overloads of both functions (with explicit signatures)
drop function if exists public.register_member_via_signup_link(text, text, text, text, uuid, text, text, text);
drop function if exists public.register_member_via_signup_link(text, text, text, text, uuid, text, text);
drop function if exists public.create_gym_member_with_membership(uuid, text, text, text, text, text, text, text, date, uuid);

-- 3. Recreate create_gym_member_with_membership (preferred_language → email)
create or replace function public.create_gym_member_with_membership(
  p_gym_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_zip_code text default null,
  p_national_id text default null,
  p_email text default null,
  p_status text default 'active',
  p_join_date date default current_date,
  p_plan_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members;
  v_membership public.memberships;
  v_plan public.gym_plans;
  v_end_date date;
  v_join date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_gym_owner(p_gym_id) then
    raise exception 'Not allowed for this gym';
  end if;
  v_join := coalesce(p_join_date, current_date);
  insert into public.members (gym_id, first_name, last_name, phone, zip_code, national_id, email, status, join_date)
  values (
    p_gym_id,
    trim(p_first_name), trim(p_last_name), trim(p_phone),
    nullif(trim(coalesce(p_zip_code, '')), ''),
    nullif(trim(coalesce(p_national_id, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    coalesce(p_status, 'active'), v_join
  )
  returning * into v_member;

  if p_plan_id is not null then
    select * into v_plan from public.gym_plans gp where gp.id = p_plan_id and gp.gym_id = p_gym_id;
    if not found then raise exception 'Plan not found for this gym'; end if;
    v_end_date := v_join + v_plan.duration_days;
    insert into public.memberships (gym_id, member_id, plan_id, start_date, end_date, price, status)
    values (p_gym_id, v_member.id, v_plan.id, v_join, v_end_date::date, v_plan.price, 'active')
    returning * into v_membership;
    begin
      perform public.record_membership_income_payment(p_gym_id, v_member.id, v_membership.id, v_membership.price, v_join::timestamptz + interval '12 hours');
    exception when others then null;
    end;
  end if;

  return jsonb_build_object(
    'member', to_jsonb(v_member),
    'membership', case when p_plan_id is null then null else to_jsonb(v_membership) end
  );
end;
$$;

revoke all on function public.create_gym_member_with_membership(uuid, text, text, text, text, text, text, text, date, uuid) from public;
grant execute on function public.create_gym_member_with_membership(uuid, text, text, text, text, text, text, text, date, uuid) to authenticated;

-- 4. Recreate register_member_via_signup_link (preferred_language → email)
create or replace function public.register_member_via_signup_link(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_plan_id uuid,
  p_zip_code text default null,
  p_national_id text default null,
  p_email text default null
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
  if auth.uid() is null then raise exception 'Sign in required to complete registration'; end if;
  if nullif(trim(p_token), '') is null then raise exception 'Invalid signup link'; end if;
  if p_plan_id is null then raise exception 'Please select a membership plan'; end if;

  select * into v_link from public.signup_links sl where sl.token = trim(p_token) and sl.active = true limit 1;
  if not found then raise exception 'Signup link is invalid or expired'; end if;
  if exists (select 1 from public.members m where m.gym_id = v_link.gym_id and m.user_id = auth.uid()) then
    raise exception 'You are already registered at this gym';
  end if;
  if exists (select 1 from public.members m where m.gym_id = v_link.gym_id and m.phone = trim(p_phone)) then
    raise exception 'This phone number is already registered at this gym';
  end if;

  select * into v_plan from public.gym_plans gp where gp.id = p_plan_id and gp.gym_id = v_link.gym_id;
  if not found then raise exception 'Plan not found for this gym'; end if;

  insert into public.members (gym_id, user_id, first_name, last_name, phone, zip_code, national_id, email, status, join_date)
  values (
    v_link.gym_id, auth.uid(),
    trim(p_first_name), trim(p_last_name), trim(p_phone),
    nullif(trim(coalesce(p_zip_code, '')), ''),
    nullif(trim(coalesce(p_national_id, '')), ''),
    nullif(trim(coalesce(p_email, '')), ''),
    'active', current_date
  )
  returning * into v_member;

  v_end_date := current_date + v_plan.duration_days;
  insert into public.memberships (gym_id, member_id, plan_id, start_date, end_date, price, status)
  values (v_link.gym_id, v_member.id, v_plan.id, current_date, v_end_date, v_plan.price, 'active')
  returning * into v_membership;

  begin
    perform public.record_membership_income_payment(v_link.gym_id, v_member.id, v_membership.id, v_membership.price, current_date::timestamptz + interval '12 hours');
  exception when others then null;
  end;

  return jsonb_build_object('member', to_jsonb(v_member), 'membership', to_jsonb(v_membership), 'plan_name', v_plan.name);
end;
$$;

revoke all on function public.register_member_via_signup_link(text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.register_member_via_signup_link(text, text, text, text, uuid, text, text, text) to authenticated;
