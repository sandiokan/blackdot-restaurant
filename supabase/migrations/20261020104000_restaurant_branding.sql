-- BLACKDOT Restaurant: per-restaurant visual identity, isolated by restaurant_id.
create table public.restaurant_branding (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  display_name text,
  logo_path text,
  theme_mode text not null default 'DARK' check (theme_mode in ('DARK', 'LIGHT')),
  primary_color text not null default '#EEB36D' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.restaurant_branding enable row level security;

revoke all on table public.restaurant_branding from anon;
revoke all on table public.restaurant_branding from authenticated;
grant select, insert, update on table public.restaurant_branding to authenticated;

create policy "Authorized users read own restaurant branding"
on public.restaurant_branding for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurant_branding.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Owners create own restaurant branding"
on public.restaurant_branding for insert to authenticated
with check (public.is_restaurant_owner(restaurant_id));

create policy "Owners update own restaurant branding"
on public.restaurant_branding for update to authenticated
using (public.is_restaurant_owner(restaurant_id))
with check (public.is_restaurant_owner(restaurant_id));
