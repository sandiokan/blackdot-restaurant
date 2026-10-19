-- Required by the server-side manage-restaurant-access Edge Function list action.
-- service_role bypasses RLS but still needs table privileges to expire and read invitations.
grant select, update on table public.restaurant_access_invites to service_role;
