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
