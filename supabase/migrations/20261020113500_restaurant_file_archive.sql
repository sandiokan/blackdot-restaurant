-- BLACKDOT Restaurant: private document archive isolated by restaurant_id.

create table public.restaurant_files (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  storage_path text not null unique check (storage_path like restaurant_id::text || '/%'),
  file_name text not null check (char_length(file_name) between 1 and 180),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index restaurant_files_restaurant_created_idx
  on public.restaurant_files (restaurant_id, created_at desc);

alter table public.restaurant_files enable row level security;

revoke all on table public.restaurant_files from anon;
revoke all on table public.restaurant_files from authenticated;
grant select, insert, delete on table public.restaurant_files to authenticated;

create policy "Tenant users read own restaurant files"
on public.restaurant_files for select to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurant_files.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Operational users upload own restaurant files"
on public.restaurant_files for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurant_files.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operational users delete own restaurant files"
on public.restaurant_files for delete to authenticated
using (
  exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id = restaurant_files.restaurant_id
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-documents',
  'restaurant-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Tenant users read own restaurant documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'restaurant-documents'
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id::text = (storage.foldername(name))[1]
      and restaurant_users.role in ('OWNER', 'MANAGER', 'EMPLOYEE')
  )
);

create policy "Operational users upload own restaurant documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-documents'
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id::text = (storage.foldername(name))[1]
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);

create policy "Operational users delete own restaurant documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'restaurant-documents'
  and exists (
    select 1
    from public.restaurant_users
    where restaurant_users.user_id = auth.uid()
      and restaurant_users.restaurant_id::text = (storage.foldername(name))[1]
      and restaurant_users.role in ('OWNER', 'MANAGER')
  )
);
