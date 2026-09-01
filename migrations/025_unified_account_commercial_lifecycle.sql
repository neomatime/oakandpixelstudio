-- Phase 1: evolve clients into the unified OPS Account lifecycle.
-- Existing client_id foreign keys remain valid; "clients" is the physical account table.

alter table public.clients
  add column if not exists normalised_domain text,
  add column if not exists business_description text,
  add column if not exists location text,
  add column if not exists lead_source text default 'Manual',
  add column if not exists account_owner text,
  add column if not exists opportunity_score integer,
  add column if not exists opportunity_classification text,
  add column if not exists recommended_service_tier text,
  add column if not exists recommendation_confidence integer,
  add column if not exists recommendation_rationale text,
  add column if not exists recommended_at timestamptz,
  add column if not exists actual_service_tier text,
  add column if not exists estimated_setup_value numeric(12,2),
  add column if not exists estimated_monthly_value numeric(12,2),
  add column if not exists watchlisted boolean not null default false,
  add column if not exists watchlist_reason text,
  add column if not exists next_review_date date,
  add column if not exists last_website_check timestamptz,
  add column if not exists archived_at timestamptz;

-- Prospect accounts may legitimately exist before a primary contact is identified.
alter table public.clients alter column full_name drop not null;
alter table public.clients alter column email drop not null;

alter table public.clients drop constraint if exists clients_lifecycle_stage_check;
alter table public.clients add constraint clients_lifecycle_stage_check
  check (lifecycle_stage in ('Lead','Discovery','Proposal','Agreement','Onboarding','Active','Partner','Lost','Disqualified'));
alter table public.clients drop constraint if exists clients_opportunity_score_check;
alter table public.clients add constraint clients_opportunity_score_check check (opportunity_score between 0 and 100);
alter table public.clients drop constraint if exists clients_recommendation_confidence_check;
alter table public.clients add constraint clients_recommendation_confidence_check check (recommendation_confidence between 0 and 100);
alter table public.clients drop constraint if exists clients_recommended_tier_check;
alter table public.clients add constraint clients_recommended_tier_check check (recommended_service_tier is null or recommended_service_tier in ('Signature','Growth','Premium'));
alter table public.clients drop constraint if exists clients_actual_tier_check;
alter table public.clients add constraint clients_actual_tier_check check (actual_service_tier is null or actual_service_tier in ('Signature','Growth','Premium'));
alter table public.clients drop constraint if exists clients_lead_source_check;
alter table public.clients add constraint clients_lead_source_check check (lead_source in ('Manual','OPS Discovery Engine','Referral','Website Application','Inbound','Other'));

create or replace function public.ops_normalise_domain(value text)
returns text language sql immutable parallel safe security invoker
set search_path = ''
as $$
  select nullif(regexp_replace(regexp_replace(lower(trim(value)), '^https?://(www\.)?', ''), '[/#?].*$', ''), '');
$$;

update public.clients
set normalised_domain = public.ops_normalise_domain(website)
where normalised_domain is null and website is not null;

create unique index if not exists clients_normalised_domain_unique
  on public.clients(normalised_domain) where normalised_domain is not null and archived_at is null;
create index if not exists clients_lifecycle_stage_idx on public.clients(lifecycle_stage);
create index if not exists clients_opportunity_score_idx on public.clients(opportunity_score desc);

create table if not exists public.account_contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  first_name text not null,
  last_name text,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  is_primary boolean not null default false,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists account_contacts_one_primary on public.account_contacts(account_id) where is_primary;

create table if not exists public.account_activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  activity_type text not null,
  title text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists account_activities_account_time_idx on public.account_activities(account_id, occurred_at desc);

create table if not exists public.website_audits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'Draft' check (status in ('Draft','In Progress','Completed','Ready for Review','Approved','Rejected')),
  website_url text,
  overall_score integer check (overall_score between 0 and 100),
  executive_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_category_scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.website_audits(id) on delete cascade,
  category text not null check (category in ('Digital Presence','User Experience','Conversion','Customer Journey','Performance','Accessibility','Search Foundation','Digital Operations')),
  score integer not null check (score between 0 and 100),
  summary text,
  unique(audit_id, category)
);

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.website_audits(id) on delete cascade,
  category text not null,
  finding text not null,
  evidence text not null,
  business_impact text not null,
  recommendation text not null,
  ops_capability text check (ops_capability in ('Signature','Growth','Premium')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  overall_score integer not null check (overall_score between 0 and 100),
  digital_improvement integer not null check (digital_improvement between 0 and 30),
  commercial_maturity integer not null check (commercial_maturity between 0 and 20),
  service_fit integer not null check (service_fit between 0 and 20),
  operational_complexity integer not null check (operational_complexity between 0 and 10),
  contactability integer not null check (contactability between 0 and 10),
  potential_business_value integer not null check (potential_business_value between 0 and 10),
  classification text not null check (classification in ('High','Qualified','Review','Low')),
  reasoning text,
  calculated_at timestamptz not null default now()
);

create table if not exists public.service_recommendations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  audit_id uuid references public.website_audits(id) on delete set null,
  recommended_tier text not null check (recommended_tier in ('Signature','Growth','Premium')),
  confidence integer not null check (confidence between 0 and 100),
  rationale text not null,
  recommended_at timestamptz not null default now()
);

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  audit_id uuid references public.website_audits(id) on delete set null,
  status text not null default 'Draft' check (status in ('Draft','Ready for Review','Approved','Sent')),
  content jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  contact_id uuid references public.account_contacts(id) on delete set null,
  status text not null default 'Not Contacted' check (status in ('Not Contacted','Permission Requested','Permission Granted','Audit Sent','Follow-up Due','Meeting Booked','No Response','Declined')),
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  outreach_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'Queued' check (status in ('Queued','Running','Completed','Failed','Cancelled')),
  candidates_found integer not null default 0,
  accounts_created integer not null default 0,
  duplicates_skipped integer not null default 0,
  audits_queued integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.clients(id) on delete cascade,
  discovery_run_id uuid references public.discovery_runs(id) on delete set null,
  status text not null default 'Queued' check (status in ('Queued','Running','Completed','Failed','Cancelled')),
  provider text,
  provider_metadata jsonb not null default '{}'::jsonb,
  error text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create or replace function public.ops_account_before_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.normalised_domain := public.ops_normalise_domain(new.website);
  if new.opportunity_score is not null then
    new.opportunity_classification := case
      when new.opportunity_score >= 80 then 'High'
      when new.opportunity_score >= 65 then 'Qualified'
      when new.opportunity_score >= 50 then 'Review'
      else 'Low' end;
  end if;
  if tg_op = 'UPDATE' and new.lifecycle_stage is distinct from old.lifecycle_stage then
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists ops_account_before_write on public.clients;
create trigger ops_account_before_write before insert or update on public.clients
for each row execute function public.ops_account_before_write();

create or replace function public.ops_log_account_stage_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.account_activities(account_id, activity_type, title, detail)
    values (new.id, 'account_created', 'Account created', 'Source: ' || coalesce(new.lead_source, 'Manual'));
  elsif new.lifecycle_stage is distinct from old.lifecycle_stage then
    insert into public.account_activities(account_id, activity_type, title, detail, metadata)
    values (new.id, 'stage_changed', 'Stage changed', coalesce(old.lifecycle_stage, 'Unspecified') || ' → ' || new.lifecycle_stage,
      jsonb_build_object('from', old.lifecycle_stage, 'to', new.lifecycle_stage));
  end if;
  return new;
end;
$$;
drop trigger if exists ops_log_account_stage_change on public.clients;
create trigger ops_log_account_stage_change after insert or update of lifecycle_stage on public.clients
for each row execute function public.ops_log_account_stage_change();

do $$
declare table_name text;
begin
  foreach table_name in array array['account_contacts','account_activities','website_audits','audit_category_scores','audit_findings','opportunity_scores','service_recommendations','audit_reports','outreach_records','discovery_runs','audit_jobs']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "authenticated_ops_access" on public.%I', table_name);
    execute format('create policy "authenticated_ops_access" on public.%I for all to authenticated using (true) with check (true)', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end $$;

grant execute on function public.ops_normalise_domain(text) to authenticated;
