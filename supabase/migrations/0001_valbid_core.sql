create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  riot_game_name text not null,
  riot_tag_line text not null,
  region text not null default 'India',
  riot_puuid text unique,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (riot_game_name, riot_tag_line)
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  minimum_bid numeric(12,2) not null default 100,
  minimum_increment numeric(12,2) not null default 100,
  currency text not null default 'INR',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.board_entries (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  verified_spend numeric(12,2) not null default 0 check (verified_spend >= 0),
  first_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (board_id, player_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  board_entry_id uuid references public.board_entries(id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (provider, provider_payment_id)
);

create table if not exists public.bid_history (
  id uuid primary key default gen_random_uuid(),
  board_entry_id uuid not null references public.board_entries(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  previous_spend numeric(12,2) not null default 0,
  new_spend numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  snapshot_date date not null,
  payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (board_id, snapshot_date)
);

create index if not exists idx_board_entries_rank on public.board_entries(board_id, verified_spend desc, first_verified_at asc);
create index if not exists idx_payments_status on public.payments(status, created_at desc);
create index if not exists idx_bid_history_entry on public.bid_history(board_entry_id, created_at desc);

alter table public.players enable row level security;
alter table public.boards enable row level security;
alter table public.board_entries enable row level security;
alter table public.payments enable row level security;
alter table public.bid_history enable row level security;
alter table public.daily_snapshots enable row level security;

create policy "public can read verified players" on public.players for select using (verified = true);
create policy "public can read active boards" on public.boards for select using (active = true);
create policy "public can read board entries" on public.board_entries for select using (true);
create policy "public can read bid history" on public.bid_history for select using (true);
create policy "service role manages payments" on public.payments for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
