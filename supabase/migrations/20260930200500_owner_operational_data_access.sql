revoke all privileges on table public.reservations, public.staff, public.shifts from anon;

drop policy if exists "Prototype anon read reservations" on public.reservations;
drop policy if exists "Prototype anon create reservations" on public.reservations;
drop policy if exists "Prototype anon update reservations" on public.reservations;
drop policy if exists "Prototype anon read staff" on public.staff;
drop policy if exists "Prototype anon create staff" on public.staff;
drop policy if exists "Prototype anon update staff" on public.staff;
drop policy if exists "Prototype anon read shifts" on public.shifts;
drop policy if exists "Prototype anon create shifts" on public.shifts;
drop policy if exists "Prototype anon update shifts" on public.shifts;

grant select, insert, update, delete on table public.reservations, public.staff, public.shifts to authenticated;

create policy "Owners select own reservations"
on public.reservations for select to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners create own reservations"
on public.reservations for insert to authenticated
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners update own reservations"
on public.reservations for update to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
)
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners delete own reservations"
on public.reservations for delete to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = reservations.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners select own staff"
on public.staff for select to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners create own staff"
on public.staff for insert to authenticated
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners update own staff"
on public.staff for update to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
)
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners delete own staff"
on public.staff for delete to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = staff.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners select own shifts"
on public.shifts for select to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners create own shifts"
on public.shifts for insert to authenticated
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners update own shifts"
on public.shifts for update to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
)
with check (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);

create policy "Owners delete own shifts"
on public.shifts for delete to authenticated
using (
  exists (
    select 1 from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = shifts.restaurant_id
      and restaurant_users.role = 'OWNER'
  )
);
