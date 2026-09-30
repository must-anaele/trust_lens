create table if not exists public.trustlens_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  cmc_id bigint not null check (cmc_id > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, cmc_id)
);

create index if not exists trustlens_watchlist_created_at_idx
  on public.trustlens_watchlist (user_id, created_at desc);

create table if not exists public.trustlens_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cmc_id bigint not null check (cmc_id > 0),
  condition text not null check (condition in ('price_above', 'price_below', 'change_above', 'change_below')),
  threshold numeric not null check (threshold > 0),
  last_value numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists trustlens_price_alerts_active_idx
  on public.trustlens_price_alerts (is_active, cmc_id) where is_active;
create index if not exists trustlens_price_alerts_user_idx
  on public.trustlens_price_alerts (user_id, created_at desc);

create table if not exists public.trustlens_price_alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.trustlens_price_alerts(id) on delete set null,
  cmc_id bigint not null check (cmc_id > 0),
  condition text not null check (condition in ('price_above', 'price_below', 'change_above', 'change_below')),
  threshold numeric not null check (threshold > 0),
  observed_value numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists trustlens_price_alert_events_user_idx
  on public.trustlens_price_alert_events (user_id, created_at desc);

alter table public.trustlens_watchlist enable row level security;
alter table public.trustlens_price_alerts enable row level security;
alter table public.trustlens_price_alert_events enable row level security;

revoke all on public.trustlens_watchlist from anon, authenticated;
revoke all on public.trustlens_price_alerts from anon, authenticated;
revoke all on public.trustlens_price_alert_events from anon, authenticated;
grant all on public.trustlens_watchlist to service_role;
grant all on public.trustlens_price_alerts to service_role;
grant all on public.trustlens_price_alert_events to service_role;
