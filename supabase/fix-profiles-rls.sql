-- Run this in Supabase SQL Editor if signup fails with:
-- "new row violates row-level security policy for table profiles"

-- 1) Secure profile ensure (bypasses RLS safely — only for auth.uid())
create or replace function public.ensure_owner_profile(
  p_full_name text default '',
  p_email text default ''
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, full_name, email)
  values (
    auth.uid(),
    coalesce(p_full_name, ''),
    coalesce(p_email, '')
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    email = coalesce(nullif(excluded.email, ''), profiles.email)
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ensure_owner_profile(text, text) from public;
grant execute on function public.ensure_owner_profile(text, text) to authenticated;

-- 2) Fix trigger (creates profile on auth.users insert)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Recreate profiles RLS (upsert-friendly for authenticated users)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
