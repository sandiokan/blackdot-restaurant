-- BLACKDOT Restaurant: isolated BLACKDOT Studio identity for branding administration.
-- No Studio account is created or assigned by this migration.

create table public.blackdot_studio_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'STUDIO_ADMIN'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.blackdot_studio_users enable row level security;

revoke all on table public.blackdot_studio_users from anon, authenticated;
grant select on table public.blackdot_studio_users to authenticated;

create policy "Studio users read own administrative access"
on public.blackdot_studio_users for select to authenticated
using (user_id = auth.uid());

create or replace function public.is_blackdot_studio_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.blackdot_studio_users
    where user_id = auth.uid()
      and role = 'STUDIO_ADMIN'
      and active = true
  );
$$;

revoke all on function public.is_blackdot_studio_admin() from public;
grant execute on function public.is_blackdot_studio_admin() to authenticated;

create policy "Studio admins read restaurants for branding"
on public.restaurants for select to authenticated
using (public.is_blackdot_studio_admin());

-- Tenant branding remains read-only. Only the separate Studio identity may mutate it.
grant insert, update, delete on table public.restaurant_branding to authenticated;

create policy "Studio admins create restaurant branding"
on public.restaurant_branding for insert to authenticated
with check (public.is_blackdot_studio_admin());

create policy "Studio admins update restaurant branding"
on public.restaurant_branding for update to authenticated
using (public.is_blackdot_studio_admin())
with check (public.is_blackdot_studio_admin());

create policy "Studio admins delete restaurant branding"
on public.restaurant_branding for delete to authenticated
using (public.is_blackdot_studio_admin());

create policy "Studio admins manage restaurant brand assets"
on storage.objects for all to authenticated
using (
  bucket_id = 'restaurant-brand-assets'
  and public.is_blackdot_studio_admin()
  and exists (
    select 1
    from public.restaurants
    where restaurants.id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'restaurant-brand-assets'
  and public.is_blackdot_studio_admin()
  and exists (
    select 1
    from public.restaurants
    where restaurants.id::text = (storage.foldername(name))[1]
  )
);
