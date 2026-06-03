-- Run in Supabase SQL Editor if signup fails with:
-- "new row violates row-level security policy for table gyms"
--
-- Prerequisite: run supabase/fix-profiles-rls.sql first (creates ensure_owner_profile).

-- Helper used by gym_plans / signup_links policies (must exist before policies below)
create or replace function public.is_gym_owner(gym uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gyms g where g.id = gym and g.owner_id = auth.uid()
  );
$$;

-- Creates gym + plans + signup link as the logged-in owner (bypasses RLS safely)
create or replace function public.create_owner_gym_with_plans(
  p_name text,
  p_slug text,
  p_address text,
  p_phone text,
  p_base_currency text default 'EUR',
  p_plans jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym public.gyms;
  v_plans jsonb := '[]'::jsonb;
  v_plan jsonb;
  v_plan_row public.gym_plans;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.ensure_owner_profile('', '');

  insert into public.gyms (owner_id, name, slug, address, phone, base_currency)
  values (
    auth.uid(),
    trim(p_name),
    trim(p_slug),
    trim(p_address),
    trim(p_phone),
    coalesce(nullif(trim(p_base_currency), ''), 'EUR')
  )
  returning * into v_gym;

  for v_plan in select * from jsonb_array_elements(coalesce(p_plans, '[]'::jsonb))
  loop
    if coalesce(trim(v_plan->>'name'), '') = '' then
      continue;
    end if;

    insert into public.gym_plans (gym_id, name, price, duration_days)
    values (
      v_gym.id,
      trim(v_plan->>'name'),
      coalesce((v_plan->>'price')::numeric, 0),
      greatest(coalesce((v_plan->>'duration_days')::int, 30), 1)
    )
    returning * into v_plan_row;

    v_plans := v_plans || to_jsonb(v_plan_row);
  end loop;

  if jsonb_array_length(v_plans) = 0 then
    raise exception 'At least one valid pricing plan is required';
  end if;

  insert into public.signup_links (gym_id, token, active)
  values (v_gym.id, replace(gen_random_uuid()::text, '-', ''), true);

  return jsonb_build_object(
    'gym', to_jsonb(v_gym),
    'plans', v_plans
  );
end;
$$;

revoke all on function public.create_owner_gym_with_plans(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_owner_gym_with_plans(text, text, text, text, text, jsonb) to authenticated;

-- Gyms RLS (authenticated + explicit checks)
alter table public.gyms enable row level security;

drop policy if exists "gyms_select_own" on public.gyms;
drop policy if exists "gyms_insert_own" on public.gyms;
drop policy if exists "gyms_update_own" on public.gyms;
drop policy if exists "gyms_delete_own" on public.gyms;

create policy "gyms_select_own"
  on public.gyms for select to authenticated
  using (auth.uid() = owner_id);

create policy "gyms_insert_own"
  on public.gyms for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "gyms_update_own"
  on public.gyms for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "gyms_delete_own"
  on public.gyms for delete to authenticated
  using (auth.uid() = owner_id);

-- Gym plans: allow owner via gym ownership (fix insert for new gyms)
drop policy if exists "gym_plans_select" on public.gym_plans;
drop policy if exists "gym_plans_insert" on public.gym_plans;
drop policy if exists "gym_plans_update" on public.gym_plans;
drop policy if exists "gym_plans_delete" on public.gym_plans;

create policy "gym_plans_select"
  on public.gym_plans for select to authenticated
  using (public.is_gym_owner(gym_id));

create policy "gym_plans_insert"
  on public.gym_plans for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "gym_plans_update"
  on public.gym_plans for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create policy "gym_plans_delete"
  on public.gym_plans for delete to authenticated
  using (public.is_gym_owner(gym_id));

-- Signup links
drop policy if exists "signup_links_all" on public.signup_links;

create policy "signup_links_select"
  on public.signup_links for select to authenticated
  using (public.is_gym_owner(gym_id));

create policy "signup_links_insert"
  on public.signup_links for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "signup_links_update"
  on public.signup_links for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create policy "signup_links_delete"
  on public.signup_links for delete to authenticated
  using (public.is_gym_owner(gym_id));
