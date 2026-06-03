-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- PROFILES (gym owners)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

-- GYMS
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  address text not null default '',
  phone text not null default '',
  logo_url text,
  base_currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

create index if not exists gyms_owner_id_idx on public.gyms (owner_id);

-- GYM PLANS
create table if not exists public.gym_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  duration_days int not null check (duration_days > 0),
  created_at timestamptz not null default now()
);

create index if not exists gym_plans_gym_id_idx on public.gym_plans (gym_id);

-- SIGNUP LINKS
create table if not exists public.signup_links (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- MEMBERS
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  zip_code text,
  national_id text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fa')),
  birth_date date,
  gender text,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'expired', 'suspended')
  ),
  notes text,
  join_date date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists members_gym_user_id_idx
  on public.members (gym_id, user_id)
  where user_id is not null;

-- MEMBERSHIPS
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  plan_id uuid not null references public.gym_plans (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  price numeric(12, 2) not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  membership_id uuid references public.memberships (id) on delete set null,
  amount numeric(12, 2) not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer')),
  paid_at timestamptz not null default now()
);

-- COACHES
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  full_name text not null,
  phone text,
  specialty text,
  salary numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- MEMBER ↔ COACH
create table if not exists public.member_coaches (
  member_id uuid not null references public.members (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  primary key (member_id, coach_id)
);

-- ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  check_in timestamptz not null default now()
);

-- MEMBER EVENTS (AI layer)
create table if not exists public.member_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- AI INSIGHTS
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  insight_type text not null,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup (security definer bypasses RLS)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Client-callable profile ensure (avoids RLS upsert issues)
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

-- Client-callable gym + plans create (avoids RLS issues on signup)
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

  return jsonb_build_object('gym', to_jsonb(v_gym), 'plans', v_plans);
end;
$$;

revoke all on function public.create_owner_gym_with_plans(text, text, text, text, text, jsonb) from public;
grant execute on function public.create_owner_gym_with_plans(text, text, text, text, text, jsonb) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_plans enable row level security;
alter table public.signup_links enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.coaches enable row level security;
alter table public.member_coaches enable row level security;
alter table public.attendance enable row level security;
alter table public.member_events enable row level security;
alter table public.ai_insights enable row level security;

-- Profiles: own row only (authenticated role + explicit WITH CHECK for upserts)
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Gyms: owner access
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

-- Helper: gym owned by current user
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

-- Gym plans
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

-- Members & downstream tables (owner via gym_id)
create policy "members_all" on public.members for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "memberships_all" on public.memberships for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "payments_all" on public.payments for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "coaches_all" on public.coaches for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "attendance_all" on public.attendance for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "member_events_all" on public.member_events for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "ai_insights_all" on public.ai_insights for all using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));

-- member_coaches via member's gym
create policy "member_coaches_all" on public.member_coaches for all using (
  exists (
    select 1 from public.members m
    where m.id = member_coaches.member_id and public.is_gym_owner(m.gym_id)
  )
) with check (
  exists (
    select 1 from public.members m
    where m.id = member_coaches.member_id and public.is_gym_owner(m.gym_id)
  )
);
