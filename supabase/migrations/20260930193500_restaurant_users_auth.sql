create table public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'EMPLOYEE')),
  created_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create unique index restaurant_users_one_owner_per_restaurant_idx
on public.restaurant_users (restaurant_id)
where role = 'OWNER';

create index restaurant_users_user_id_idx
on public.restaurant_users (user_id);

alter table public.restaurant_users enable row level security;

revoke all on table public.restaurant_users from anon, authenticated;
grant select on table public.restaurant_users to authenticated;

create policy "Authenticated users read own restaurant access"
on public.restaurant_users for select to authenticated
using (auth.uid() = user_id);

insert into public.restaurant_users (user_id, restaurant_id, role)
select auth_user.id, restaurant.id, 'OWNER'
from auth.users auth_user
cross join lateral (
  select id
  from public.restaurants
  order by created_at asc
  limit 1
) restaurant
where lower(auth_user.email) = lower('ludoreds99@gmail.com')
on conflict (user_id, restaurant_id) do update
set role = excluded.role;
