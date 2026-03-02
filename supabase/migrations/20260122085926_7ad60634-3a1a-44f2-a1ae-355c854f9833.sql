-- Create contact/lead capture table for "For Individual/University/Government" inquiries
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  audience text not null, -- individual | university | government
  full_name text,
  email text not null,
  phone_number text,
  organization text,
  requirement text not null,
  consent_to_contact boolean not null default true,
  status text not null default 'new'
);

-- Enable Row Level Security
alter table public.contact_requests enable row level security;

-- Allow anyone (including logged-out visitors) to submit a contact request
create policy "Anyone can create contact requests"
on public.contact_requests
for insert
with check (true);

-- Do not add SELECT/UPDATE/DELETE policies by default to avoid exposing submitted data

-- Helpful indexes
create index if not exists idx_contact_requests_created_at on public.contact_requests (created_at desc);
create index if not exists idx_contact_requests_audience on public.contact_requests (audience);
create index if not exists idx_contact_requests_status on public.contact_requests (status);
