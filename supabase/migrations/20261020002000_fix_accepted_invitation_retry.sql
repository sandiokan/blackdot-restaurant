-- A repeated acceptance is valid only for the exact account already linked to the accepted invitation.
-- Do not recreate access or alter the role during a retry.
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
    and email = lower(btrim(authenticated_email))
    and (
      (status = 'PENDING' and expires_at > now())
      or status = 'ACCEPTED'
    )
  for update;

  if not found then
    raise exception 'Invalid, expired, revoked, or mismatched invitation';
  end if;

  if invitation.status = 'ACCEPTED' then
    if invitation.invited_user_id = authenticated_user_id then
      return query select invitation.restaurant_id, invitation.role;
      return;
    end if;
    raise exception 'Invitation was already accepted by another account';
  end if;

  select ru.role
  into current_role
  from public.restaurant_users as ru
  where ru.user_id = authenticated_user_id
    and ru.restaurant_id = invitation.restaurant_id;

  if current_role = 'OWNER' then
    raise exception 'Owner access cannot be changed by invitation';
  end if;

  insert into public.restaurant_users (user_id, restaurant_id, role)
  values (authenticated_user_id, invitation.restaurant_id, invitation.role)
  on conflict on constraint restaurant_users_user_id_restaurant_id_key do update
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
