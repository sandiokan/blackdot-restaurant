-- Fix the Studio Storage policy to qualify the outer storage.objects path.
-- The previous nested query resolved name as restaurants.name instead of the object path.

drop policy if exists "Studio admins manage restaurant brand assets" on storage.objects;

create policy "Studio admins manage restaurant brand assets"
on storage.objects for all to authenticated
using (
  bucket_id = 'restaurant-brand-assets'
  and public.is_blackdot_studio_admin()
  and exists (
    select 1
    from public.restaurants as target_restaurant
    where target_restaurant.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id = 'restaurant-brand-assets'
  and public.is_blackdot_studio_admin()
  and exists (
    select 1
    from public.restaurants as target_restaurant
    where target_restaurant.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
