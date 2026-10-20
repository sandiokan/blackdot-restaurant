-- BLACKDOT Restaurant: branding is managed only by BLACKDOT Studio administrative operations.
-- Tenant users retain read-only access to their own branding and logo assets.

revoke insert, update, delete on table public.restaurant_branding from authenticated;

drop policy if exists "Owners create own restaurant branding" on public.restaurant_branding;
drop policy if exists "Owners update own restaurant branding" on public.restaurant_branding;
drop policy if exists "Owners delete own restaurant branding" on public.restaurant_branding;

drop policy if exists "Owners upload own restaurant brand assets" on storage.objects;
drop policy if exists "Owners update own restaurant brand assets" on storage.objects;
drop policy if exists "Owners delete own restaurant brand assets" on storage.objects;
