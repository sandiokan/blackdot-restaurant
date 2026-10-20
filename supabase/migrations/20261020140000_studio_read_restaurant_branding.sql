-- BLACKDOT Studio must read existing branding before editing a selected restaurant.
-- Tenant read policy remains unchanged.

create policy "Studio admins read restaurant branding"
on public.restaurant_branding for select to authenticated
using (public.is_blackdot_studio_admin());
