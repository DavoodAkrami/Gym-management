-- Allow a member to leave (delete themselves from) a gym.
-- The authenticated user must be the member record being deleted.

create or replace function public.leave_gym()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_gym_id    uuid;
begin
  select id, gym_id into v_member_id, v_gym_id
    from public.members
   where user_id = auth.uid()
   limit 1;

  if v_member_id is null then
    raise exception 'no_member_found' using hint = 'No member found for this user.';
  end if;

  -- Delete memberships (income stays, no cascade effect)
  delete from public.memberships
   where member_id = v_member_id;

  -- Delete member_coaches links
  delete from public.member_coaches
   where member_id = v_member_id;

  -- Delete member_program_memberships
  delete from public.member_program_memberships
   where member_id = v_member_id;

  -- Delete attendance
  delete from public.member_attendance
   where member_id = v_member_id;

  -- Delete the member record itself
  delete from public.members
   where id = v_member_id;
end;
$$;
