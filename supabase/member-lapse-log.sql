-- Optional: tracks recently lapsed members (visible to owner for 30 days after membership ends)
-- Run in Supabase SQL Editor after schema.sql / fix-gyms-rls.sql

create table if not exists public.member_lapse_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  membership_id uuid not null references public.memberships (id) on delete cascade,
  lapsed_at timestamptz not null default now(),
  visible_until date not null,
  created_at timestamptz not null default now(),
  unique (membership_id)
);

create index if not exists member_lapse_log_gym_visible_idx
  on public.member_lapse_log (gym_id, visible_until desc);

alter table public.member_lapse_log enable row level security;

drop policy if exists "member_lapse_log_all" on public.member_lapse_log;
create policy "member_lapse_log_all"
  on public.member_lapse_log for all to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

-- Record lapse when membership becomes expired/cancelled or end date is in the past
create or replace function public.track_membership_lapse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('expired', 'cancelled') or new.end_date < current_date then
    insert into public.member_lapse_log (gym_id, member_id, membership_id, lapsed_at, visible_until)
    values (
      new.gym_id,
      new.member_id,
      new.id,
      now(),
      (current_date + interval '30 days')::date
    )
    on conflict (membership_id) do update
    set
      lapsed_at = excluded.lapsed_at,
      visible_until = excluded.visible_until;
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_track_lapse on public.memberships;
create trigger memberships_track_lapse
  after insert or update of status, end_date on public.memberships
  for each row execute function public.track_membership_lapse();

-- Backfill lapse rows for existing expired memberships (last 30 days)
insert into public.member_lapse_log (gym_id, member_id, membership_id, lapsed_at, visible_until)
select
  m.gym_id,
  m.member_id,
  m.id,
  coalesce(m.created_at, now()),
  least(m.end_date + interval '30 days', current_date + interval '30 days')::date
from public.memberships m
where m.status in ('expired', 'cancelled')
   or m.end_date < current_date
on conflict (membership_id) do nothing;
