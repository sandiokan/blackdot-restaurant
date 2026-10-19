-- BLACKDOT Restaurant V1: owner, manager and employee operational permissions.
-- restaurant_users remains read-only for authenticated users; no role escalation is exposed.

revoke all privileges on table public.restaurants from anon;
revoke update on table public.restaurants from authenticated;
grant select on table public.restaurants to authenticated;
grant update (
  name,
  address,
  phone,
  email,
  lunch_open,
  lunch_close,
  lunch_capacity,
  dinner_open,
  dinner_close,
  dinner_capacity,
  updated_at
) on table public.restaurants to authenticated;

drop policy if exists "Prototype anon update restaurants" on public.restaurants;
drop policy if exists "Owners select own reservations" on public.reservations;
drop policy if exists "Owners create own reservations" on public.reservations;
drop policy if exists "Owners update own reservations" on public.reservations;
drop policy if exists "Owners select own staff" on public.staff;
drop policy if exists "Owners create own staff" on public.staff;
drop policy if exists "Owners update own staff" on public.staff;
drop policy if exists "Owners select own shifts" on public.shifts;
drop policy if exists "Owners create own shifts" on public.shifts;
drop policy if exists "Owners update own shifts" on public.shifts;

create policy "Authorized users select own reservations"
on public.reservations for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Operators create own reservations"
on public.reservations for insert to authenticated
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operators update own reservations"
on public.reservations for update to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Authorized users select own staff"
on public.staff for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Operators create own staff"
on public.staff for insert to authenticated
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operators update own staff"
on public.staff for update to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Authorized users select own shifts"
on public.shifts for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Operators create own shifts"
on public.shifts for insert to authenticated
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operators update own shifts"
on public.shifts for update to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operators update own restaurant"
on public.restaurants for update to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurants.id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurants.id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

revoke all privileges on table public.restaurant_users from anon, authenticated;
grant select on table public.restaurant_users to authenticated;
