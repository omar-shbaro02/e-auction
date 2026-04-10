create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  "fullName" text not null default '',
  email text not null unique,
  phone text not null default '',
  company text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  "postalCode" text not null default '',
  country text not null default '',
  "cardName" text not null default '',
  "cardNumber" text not null default '',
  "cardExpiry" text not null default '',
  "cardCvv" text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  slug text primary key,
  title text not null,
  category text not null,
  summary text not null,
  mode text not null check (mode in ('auction', 'buy-now', 'hybrid')),
  location text not null,
  shipping text not null,
  "currentBid" numeric,
  "buyNowPrice" numeric,
  "endsIn" text,
  stock integer not null default 1,
  grade text not null,
  gradient text not null,
  highlights jsonb not null default '[]'::jsonb,
  "seoDescription" text not null,
  "bidIncrement" numeric,
  "bidCount" integer,
  watchers integer,
  "reserveMet" boolean,
  seller text,
  "lotNumber" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  item_slug text not null references public.items (slug) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists bids_item_slug_created_at_idx on public.bids (item_slug, created_at desc);
create index if not exists bids_user_id_created_at_idx on public.bids (user_id, created_at desc);
create index if not exists items_mode_idx on public.items (mode);
create index if not exists items_category_idx on public.items (category);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.bids enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'items' and policyname = 'Public read items'
  ) then
    create policy "Public read items" on public.items for select using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users read own profile'
  ) then
    create policy "Users read own profile" on public.profiles
      for select using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users update own profile'
  ) then
    create policy "Users update own profile" on public.profiles
      for update using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'bids' and policyname = 'Users read bids'
  ) then
    create policy "Users read bids" on public.bids for select using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'bids' and policyname = 'Users insert own bids'
  ) then
    create policy "Users insert own bids" on public.bids
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
