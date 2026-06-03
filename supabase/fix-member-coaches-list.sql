-- Quick fix: members can list coaches in their gym (re-run safe)
-- Run in Supabase SQL Editor if the member "My coach" tab is empty.

drop policy if exists "coaches_select" on public.coaches;
create policy "coaches_select"
  on public.coaches for select to authenticated
  using (
    public.is_gym_owner(gym_id)
    or user_id = auth.uid()
    or gym_id in (select gym_id from public.members where user_id = auth.uid())
  );

create or replace function public.get_gym_coaches_for_member()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_member_id uuid;
begin
  select m.gym_id, m.id into v_gym_id, v_member_id
  from public.members m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit 1;

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
            where mc.coach_id = c.id and mc.member_id = v_member_id
          )
        ) as row_data
      from public.coaches c
      where c.gym_id = v_gym_id
        and coalesce(c.active, true) = true
    ) sub
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_gym_coaches_for_member() to authenticated;

-- Include coach list in member portal (works even when coaches RLS is too strict)
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

grant execute on function public.get_member_portal() to authenticated;
