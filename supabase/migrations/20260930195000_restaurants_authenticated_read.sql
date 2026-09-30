revoke select on table public.restaurants from anon;
drop policy if exists "Prototype anon read restaurants" on public.restaurants;

grant select on table public.restaurants to authenticated;

create policy "Authenticated users read assigned restaurant"
on public.restaurants for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.restaurant_id = restaurants.id
      and restaurant_users.user_id = auth.uid()
  )
);
