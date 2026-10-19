-- Required by the server-side manage-restaurant-access Edge Function invite action.
-- service_role bypasses RLS but still needs INSERT to create a pending invitation.
grant insert on table public.restaurant_access_invites to service_role;
