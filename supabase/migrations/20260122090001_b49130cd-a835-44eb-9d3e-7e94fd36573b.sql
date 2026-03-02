-- Tighten contact_requests INSERT policy (avoid WITH CHECK (true))
drop policy if exists "Anyone can create contact requests" on public.contact_requests;

create policy "Public can create contact requests with valid fields"
on public.contact_requests
for insert
with check (
  audience in ('individual','university','government')
  and email is not null
  and length(trim(email)) between 5 and 255
  and position('@' in email) > 1
  and requirement is not null
  and length(trim(requirement)) between 10 and 2000
  and (full_name is null or length(trim(full_name)) <= 120)
  and (phone_number is null or length(trim(phone_number)) <= 30)
  and (organization is null or length(trim(organization)) <= 160)
);
