-- Public gym search RPC for the gym discovery page (/gyms)
-- Run this in Supabase SQL Editor if you've already applied schema.sql before
-- this function was added, or if the function returns zero rows due to RLS.

create or replace function public.search_public_gyms(
  p_query text default '',
  p_offset int default 0,
  p_limit int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_total int;
begin
  select count(*) into v_total
  from public.gyms
  where p_query = '' or name ilike '%' || p_query || '%' or address ilike '%' || p_query || '%';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'slug', g.slug,
        'address', g.address,
        'phone', g.phone,
        'logo_url', g.logo_url
      )
      order by g.name asc
    ),
    '[]'::jsonb
  )
  into v_data
  from (
    select id, name, slug, address, phone, logo_url
    from public.gyms
    where p_query = '' or name ilike '%' || p_query || '%' or address ilike '%' || p_query || '%'
    order by name asc
    limit p_limit
    offset p_offset
  ) g;

  return jsonb_build_object(
    'data', v_data,
    'total', v_total
  );
end;
$$;

revoke all on function public.search_public_gyms(text, int, int) from public;
grant execute on function public.search_public_gyms(text, int, int) to anon, authenticated;

-- Public: fetch a single gym by slug with its membership plans and active signup link
create or replace function public.get_public_gym(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_gym jsonb;
  v_plans jsonb;
  v_signup_token text;
begin
  select id, jsonb_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'address', address,
    'phone', phone,
    'logo_url', logo_url,
    'base_currency', base_currency,
    'public_signup_enabled', public_signup_enabled
  )
  into v_gym_id, v_gym
  from public.gyms
  where slug = p_slug;

  if v_gym is null then
    return null;
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
  ) into v_plans
  from public.gym_plans gp
  where gp.gym_id = v_gym_id;

  select sl.token into v_signup_token
  from public.signup_links sl
  where sl.gym_id = v_gym_id and sl.active = true
  order by sl.created_at desc
  limit 1;

  return jsonb_build_object(
    'gym', v_gym,
    'plans', v_plans,
    'signup_token', v_signup_token
  );
end;
$$;

revoke all on function public.get_public_gym(text) from public;
grant execute on function public.get_public_gym(text) to anon, authenticated;
