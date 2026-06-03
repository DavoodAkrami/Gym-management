-- Run in Supabase SQL Editor if adding a member fails (RLS on members/memberships)

create or replace function public.create_gym_member_with_membership(
  p_gym_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_zip_code text default null,
  p_national_id text default null,
  p_preferred_language text default 'en',
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_gym_owner(p_gym_id) then
    raise exception 'Not allowed for this gym';
  end if;

  insert into public.members (
    gym_id,
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
    p_gym_id,
    trim(p_first_name),
    trim(p_last_name),
    trim(p_phone),
    nullif(trim(coalesce(p_zip_code, '')), ''),
    nullif(trim(coalesce(p_national_id, '')), ''),
    coalesce(p_preferred_language, 'en'),
    coalesce(p_status, 'active'),
    coalesce(p_join_date, current_date)
  )
  returning * into v_member;

  if p_plan_id is not null then
    select * into v_plan
    from public.gym_plans gp
    where gp.id = p_plan_id and gp.gym_id = p_gym_id;

    if not found then
      raise exception 'Plan not found for this gym';
    end if;

    v_end_date := coalesce(p_join_date, current_date) + v_plan.duration_days;

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
      p_gym_id,
      v_member.id,
      v_plan.id,
      coalesce(p_join_date, current_date),
      v_end_date::date,
      v_plan.price,
      'active'
    )
    returning * into v_membership;
  end if;

  return jsonb_build_object(
    'member', to_jsonb(v_member),
    'membership', case when p_plan_id is null then null else to_jsonb(v_membership) end
  );
end;
$$;

revoke all on function public.create_gym_member_with_membership(uuid, text, text, text, text, text, text, text, date, uuid) from public;
grant execute on function public.create_gym_member_with_membership(uuid, text, text, text, text, text, text, text, date, uuid) to authenticated;

-- Explicit memberships policies (if missing or broken)
drop policy if exists "memberships_all" on public.memberships;

create policy "memberships_select"
  on public.memberships for select to authenticated
  using (public.is_gym_owner(gym_id));

create policy "memberships_insert"
  on public.memberships for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "memberships_update"
  on public.memberships for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create policy "memberships_delete"
  on public.memberships for delete to authenticated
  using (public.is_gym_owner(gym_id));

drop policy if exists "members_all" on public.members;

create policy "members_select"
  on public.members for select to authenticated
  using (public.is_gym_owner(gym_id));

create policy "members_insert"
  on public.members for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "members_update"
  on public.members for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create policy "members_delete"
  on public.members for delete to authenticated
  using (public.is_gym_owner(gym_id));
