create extension if not exists pgcrypto;

create table if not exists public.trustlens_reviews (
  id uuid primary key default gen_random_uuid(),
  asset_slug text not null check (asset_slug in ('sut', 'msq')),
  address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  chain_id integer not null,
  result jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'needs_action')),
  review_note text,
  published boolean not null default false,
  share_token uuid unique,
  checked_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trustlens_review_publication_guard check (not published or (status = 'approved' and share_token is not null))
);

create index if not exists trustlens_reviews_checked_at_idx on public.trustlens_reviews (checked_at desc);
create index if not exists trustlens_reviews_asset_status_idx on public.trustlens_reviews (asset_slug, status, checked_at desc);

create table if not exists public.trustlens_monitor_snapshots (
  review_id uuid primary key references public.trustlens_reviews(id) on delete cascade,
  address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  chain_id integer not null,
  snapshot jsonb not null,
  checked_at timestamptz not null default now()
);

create table if not exists public.trustlens_monitor_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.trustlens_reviews(id) on delete cascade,
  asset_slug text not null check (asset_slug in ('sut', 'msq')),
  address text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  chain_id integer not null,
  change_type text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trustlens_monitor_events_created_at_idx on public.trustlens_monitor_events (created_at desc);

alter table public.trustlens_reviews enable row level security;
alter table public.trustlens_monitor_snapshots enable row level security;
alter table public.trustlens_monitor_events enable row level security;

revoke all on public.trustlens_reviews from anon, authenticated;
revoke all on public.trustlens_monitor_snapshots from anon, authenticated;
revoke all on public.trustlens_monitor_events from anon, authenticated;
grant all on public.trustlens_reviews to service_role;
grant all on public.trustlens_monitor_snapshots to service_role;
grant all on public.trustlens_monitor_events to service_role;
