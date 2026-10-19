-- Required by the server-side manage-restaurant-access Edge Function.
-- service_role bypasses RLS but still needs the table privilege for owner lookup.
grant select on table public.restaurant_users to service_role;
