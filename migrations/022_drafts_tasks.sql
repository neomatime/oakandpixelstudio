-- Persist Communications Hub drafts + tasks server-side (were localStorage-only).
-- Keeps them safe across devices/browsers. Other hub productivity state
-- (labels, pins, templates, contacts, read/star/archive flags) stays local.

create table if not exists message_drafts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete set null,
  to_email   text,
  cc         text,
  bcc        text,
  subject    text,
  body       text,
  body_html  text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table message_drafts enable row level security;
create policy "auth_all" on message_drafts for all to authenticated using (true) with check (true);
create index if not exists message_drafts_updated_idx on message_drafts (updated_at desc);

create table if not exists comm_tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Untitled task',
  status     text not null default 'todo',
  priority   text not null default 'Medium',
  due_date   date,
  email_id   uuid references messages(id) on delete set null,
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table comm_tasks enable row level security;
create policy "auth_all" on comm_tasks for all to authenticated using (true) with check (true);
create index if not exists comm_tasks_status_idx on comm_tasks (status);
