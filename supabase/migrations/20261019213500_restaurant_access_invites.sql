-- BLACKDOT Restaurant Fase 2B.1: server-side access invitation support.
-- Direct writes remain unavailable to authenticated application users.

create table public.restaurant_access_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  role text not null check (role in ('MANAGER', 'EMPLOYEE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at),
  check ((status <> 'ACCEPTED') or accepted_at is not null),
  check ((status <> 'REVOKED') or revoked_at is not null)
);

create unique index restaurant_access_invites_one_pending_email_idx
on public.restaurant_access_invites (restaurant_id, lower(email))
where status = 'PENDING';

create index restaurant_access_invites_restaurant_status_idx
on public.restaurant_access_invites (restaurant_id, status, created_at desc);

create index restaurant_access_invites_created_by_sent_at_idx
on public.restaurant_access_invites (created_by, sent_at desc);

alter table public.restaurant_access_invites enable row level security;
revoke all privileges on table public.restaurant_access_invites from anon, authenticated;
grant select on table public.restaurant_access_invites to authenticated;

-- This helper bypasses restaurant_users RLS only to answer one boolean question.
-- It prevents recursive policies while exposing no membership rows.
create or replace function public.is_restaurant_owner(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_users
    where user_id = auth.uid()
      and restaurant_id = target_restaurant_id
      and role = 'OWNER'
  );
$$;

revoke all on function public.is_restaurant_owner(uuid) from public, anon;
grant execute on function public.is_restaurant_owner(uuid) to authenticated;

-- Owner list access is read-only and limited to their own restaurant.
drop policy if exists "Authenticated users read own restaurant access" on public.restaurant_users;
create policy "Users read own or owner restaurant access"
on public.restaurant_users for select to authenticated
using (
  auth.uid() = user_id
  or public.is_restaurant_owner(restaurant_id)
);

create policy "Owners read own restaurant invites"
on public.restaurant_access_invites for select to authenticated
using (public.is_restaurant_owner(restaurant_id));

-- Exact email lookup is server-only, required to avoid duplicate Auth accounts.
create or replace function public.find_auth_user_id_by_email(target_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(target_email))
  limit 1;
$$;

revoke all on function public.find_auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_id_by_email(text) to service_role;

-- Accepting an invitation is atomic: invitation state and restaurant access change together.
create or replace function public.accept_restaurant_access_invitation(
  target_invitation_id uuid,
  authenticated_user_id uuid,
  authenticated_email text
)
returns table (restaurant_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.restaurant_access_invites%rowtype;
  current_role text;
begin
  select *
  into invitation
  from public.restaurant_access_invites
  where id = target_invitation_id
    and status = 'PENDING'
    and expires_at > now()
    and email = lower(btrim(authenticated_email))
  for update;

  if not found then
    raise exception 'Invalid, expired, revoked, or mismatched invitation';
  end if;

  select role
  into current_role
  from public.restaurant_users
  where user_id = authenticated_user_id
    and restaurant_id = invitation.restaurant_id;

  if current_role = 'OWNER' then
    raise exception 'Owner access cannot be changed by invitation';
  end if;

  insert into public.restaurant_users (user_id, restaurant_id, role)
  values (authenticated_user_id, invitation.restaurant_id, invitation.role)
  on conflict (user_id, restaurant_id) do update
  set role = excluded.role
  where public.restaurant_users.role in ('MANAGER', 'EMPLOYEE');

  if not found then
    raise exception 'Restaurant access could not be assigned';
  end if;

  update public.restaurant_access_invites
  set status = 'ACCEPTED',
      invited_user_id = authenticated_user_id,
      accepted_at = now()
  where id = invitation.id;

  return query select invitation.restaurant_id, invitation.role;
end;
$$;

revoke all on function public.accept_restaurant_access_invitation(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_restaurant_access_invitation(uuid, uuid, text) to service_role;
