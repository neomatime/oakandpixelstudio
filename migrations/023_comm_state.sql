-- Persist the rest of the Communications Hub productivity state server-side.
-- Message flags (read/star/pin/archive/label/priority), local contacts,
-- templates, and settings are kept as one JSONB blob (single-operator app).
-- saveCommState() upserts this row; first load seeds it from localStorage.

create table if not exists comm_state (
  id         text primary key default 'default',
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table comm_state enable row level security;
create policy "auth_all" on comm_state for all to authenticated using (true) with check (true);
