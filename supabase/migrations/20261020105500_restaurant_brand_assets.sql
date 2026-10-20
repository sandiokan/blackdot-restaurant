-- BLACKDOT Restaurant: private tenant-owned logo storage and branding reset support.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-brand-assets',
  'restaurant-brand-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

revoke all on table storage.objects from anon;
grant select, insert, update, delete on table storage.objects to authenticated;

create policy "Authorized users read own restaurant brand assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'restaurant-brand-assets'
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id::text = (storage.foldername(name))[1]
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Owners upload own restaurant brand assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-brand-assets'
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id::text = (storage.foldername(name))[1]
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners update own restaurant brand assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'restaurant-brand-assets'
  and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'restaurant-brand-assets'
  and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

create policy "Owners delete own restaurant brand assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'restaurant-brand-assets'
  and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

grant delete on table public.restaurant_branding to authenticated;

create policy "Owners delete own restaurant branding"
on public.restaurant_branding for delete to authenticated
using (public.is_restaurant_owner(restaurant_id));
