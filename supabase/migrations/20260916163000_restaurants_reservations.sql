create extension if not exists pgcrypto;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  lunch_open time not null default '12:00',
  lunch_close time not null default '15:00',
  lunch_capacity integer not null default 80 check (lunch_capacity > 0),
  dinner_open time not null default '19:00',
  dinner_close time not null default '23:00',
  dinner_capacity integer not null default 80 check (dinner_capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_name text not null,
  phone text not null,
  date date not null,
  time time not null,
  guests integer not null check (guests > 0 and guests <= 50),
  service text not null check (service in ('Pranzo', 'Cena')),
  source text not null check (source in ('Telefono', 'Sito', 'WhatsApp', 'Walk-in')),
  status text not null default 'pending' check (status in ('confirmed', 'pending', 'cancelled', 'completed')),
  notes text not null default '',
  table_name text not null default 'Da assegnare',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_restaurant_date_idx on public.reservations (restaurant_id, date, time);

alter table public.restaurants enable row level security;
alter table public.reservations enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.restaurants to anon;
grant select, insert, update on public.reservations to anon;

create policy "Prototype anon read restaurants"
on public.restaurants for select to anon
using (true);

create policy "Prototype anon update restaurants"
on public.restaurants for update to anon
using (true) with check (true);

create policy "Prototype anon read reservations"
on public.reservations for select to anon
using (true);

create policy "Prototype anon create reservations"
on public.reservations for insert to anon
with check (true);

create policy "Prototype anon update reservations"
on public.reservations for update to anon
using (true) with check (true);

insert into public.restaurants (
  id, name, address, phone, email,
  lunch_open, lunch_close, lunch_capacity,
  dinner_open, dinner_close, dinner_capacity
) values (
  '00000000-0000-4000-8000-000000000001',
  'Osteria delle Streghe',
  'Via delle Rose 12, Brescia',
  '+39 030 1234567',
  'info@blackdotstudio.it',
  '12:00', '15:00', 80,
  '19:00', '23:00', 80
);

insert into public.reservations (
  id, restaurant_id, customer_name, phone, date, time, guests,
  service, source, status, notes, table_name
) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Marco Rinaldi', '+39 333 214 8890', '2026-09-16', '12:30', 2, 'Pranzo', 'Telefono', 'confirmed', 'Allergia al glutine', 'Tavolo 2'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Giulia Bianchi', '+39 347 663 1082', '2026-09-16', '13:00', 4, 'Pranzo', 'Sito', 'confirmed', 'Tavolo vista giardino', 'Tavolo 5'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Luca Ferrari', '+39 329 830 5571', '2026-09-16', '13:00', 6, 'Pranzo', 'WhatsApp', 'pending', 'Occasione speciale', 'Tavolo 8'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'Anna Verdi', '+39 320 118 0245', '2026-09-16', '13:30', 2, 'Pranzo', 'Telefono', 'confirmed', '', 'Tavolo 3'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'Elisa Sala', '+39 333 612 2391', '2026-09-16', '13:30', 6, 'Pranzo', 'Sito', 'confirmed', 'Seggiolone', 'Tavolo 7'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'Matteo Neri', '+39 340 922 1264', '2026-09-16', '14:00', 4, 'Pranzo', 'Telefono', 'confirmed', '', 'Tavolo 4'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'Chiara Costa', '+39 331 442 7280', '2026-09-16', '14:00', 4, 'Pranzo', 'Walk-in', 'completed', '', 'Tavolo 6'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'Andrea Vitale', '+39 345 864 3712', '2026-09-16', '14:30', 4, 'Pranzo', 'Sito', 'confirmed', '', 'Tavolo 9'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001', 'Paolo Rossi', '+39 333 123 4567', '2026-09-16', '19:30', 4, 'Cena', 'Sito', 'confirmed', '', 'Tavolo 6'),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000001', 'Elena Bianchi', '+39 348 556 9081', '2026-09-16', '20:00', 2, 'Cena', 'Telefono', 'pending', 'Richiesta tavolo tranquillo', 'Tavolo 3'),
  ('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000001', 'Davide Conti', '+39 329 124 7860', '2026-09-16', '20:00', 6, 'Cena', 'WhatsApp', 'confirmed', 'Compleanno', 'Tavolo 1'),
  ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000001', 'Martina Galli', '+39 320 711 3489', '2026-09-16', '20:30', 4, 'Cena', 'Walk-in', 'confirmed', '', 'Tavolo 7'),
  ('00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000001', 'Alessandro Russo', '+39 339 186 4402', '2026-09-16', '21:00', 2, 'Cena', 'Telefono', 'confirmed', '', 'Tavolo 9'),
  ('00000000-0000-4000-8000-000000000114', '00000000-0000-4000-8000-000000000001', 'Francesca Greco', '+39 347 502 6188', '2026-09-16', '21:30', 5, 'Cena', 'Sito', 'cancelled', '', 'Tavolo 10'),
  ('00000000-0000-4000-8000-000000000115', '00000000-0000-4000-8000-000000000001', 'Giovanni Esposito', '+39 333 642 8001', '2026-09-16', '21:30', 5, 'Cena', 'WhatsApp', 'confirmed', 'Intolleranza al lattosio', 'Tavolo 5'),
  ('00000000-0000-4000-8000-000000000116', '00000000-0000-4000-8000-000000000001', 'Sara Moretti', '+39 320 908 3544', '2026-09-16', '22:00', 6, 'Cena', 'Sito', 'confirmed', '', 'Tavolo 4'),
  ('00000000-0000-4000-8000-000000000117', '00000000-0000-4000-8000-000000000001', 'Roberto Lombardi', '+39 348 771 6290', '2026-09-16', '22:00', 4, 'Cena', 'Telefono', 'confirmed', '', 'Tavolo 8'),
  ('00000000-0000-4000-8000-000000000118', '00000000-0000-4000-8000-000000000001', 'Laura Mancini', '+39 331 450 9812', '2026-09-16', '22:30', 8, 'Cena', 'Sito', 'confirmed', 'Festa di laurea', 'Tavolo 11');
