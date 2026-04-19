-- =====================================================================
-- WearWise — Database schema
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New query)
-- =====================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- Enums
-- =====================================================================
do $$ begin
  create type layer_type_t as enum (
    'base','mid','outer','bottom','footwear',
    'accessory','headwear','eyewear','timepiece','jewelry'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type fit_t as enum (
    'oversized','relaxed','regular','slim','fitted',
    'bootcut','straight','wide','tapered'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sleeve_t as enum (
    'sleeveless','short','three-quarter','long','rolled','none'
  );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Tables
-- =====================================================================

-- categories (user-editable but comes pre-seeded)
create table if not exists categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  layer_type   layer_type_t not null,
  icon         text,                               -- lucide icon name
  sort_order   int default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_categories_layer on categories(layer_type);

-- items (wardrobe pieces)
create table if not exists items (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category_id         uuid not null references categories(id) on delete restrict,
  image_url           text,                        -- public url from storage bucket 'items'
  image_path          text,                        -- storage path for deletion
  primary_color       text,                        -- hex "#RRGGBB" or name
  secondary_colors    text[] default '{}',
  fit                 fit_t,
  sleeve_length       sleeve_t,
  can_be_worn_open    boolean default false,       -- true for button-downs wearable open
  material            text[] default '{}',         -- e.g. {linen, cotton}
  formality           int check (formality between 1 and 5),  -- 1 gym / 5 black-tie
  vibe                text[] default '{}',         -- {casual, street, clean, ...}
  min_temp_c          numeric(4,1),                -- null => no lower bound
  max_temp_c          numeric(4,1),                -- null => no upper bound
  occasions           text[] default '{}',         -- {daily, church, trip, ...}
  times_of_day        text[] default '{}',         -- {morning, evening, night}
  notes               text,
  times_worn          int default 0,
  last_worn_at        timestamptz,
  archived            boolean default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_items_category      on items(category_id);
create index if not exists idx_items_formality     on items(formality);
create index if not exists idx_items_temp_range    on items(min_temp_c, max_temp_c);
create index if not exists idx_items_last_worn     on items(last_worn_at desc);
create index if not exists idx_items_not_archived  on items(archived) where archived = false;
create index if not exists idx_items_vibe_gin      on items using gin(vibe);
create index if not exists idx_items_occasions_gin on items using gin(occasions);

-- outfits (generated + saved + worn)
create table if not exists outfits (
  id             uuid primary key default gen_random_uuid(),
  items          uuid[] not null,                  -- references items.id (array)
  context        jsonb default '{}',               -- {temp_c, condition, environment, event, mode, city}
  ai_reasoning   text,
  confidence     numeric(3,2),                     -- 0.00 - 1.00
  rating         int check (rating between 1 and 5),
  worn_at        timestamptz,
  is_saved       boolean default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_outfits_worn_at    on outfits(worn_at desc);
create index if not exists idx_outfits_saved      on outfits(is_saved) where is_saved = true;
create index if not exists idx_outfits_items_gin  on outfits using gin(items);

-- style_profile (singleton row; id = '00000000-0000-0000-0000-000000000001')
create table if not exists style_profile (
  id                      uuid primary key,
  user_name               text default 'Gaurav Kumar',
  height_cm               numeric(5,1),
  weight_kg               numeric(5,1),
  body_type               text,                          -- e.g. "lean athletic"
  preferred_fits          text[] default '{}',
  preferred_colors        text[] default '{}',
  avoided_colors          text[] default '{}',
  avoided_combinations    jsonb default '[]',            -- [{reason, items:[tags]}]
  signature_combos        jsonb default '[]',            -- [{name, items:[names], vibe}]
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- modes (preset rule sets)
create table if not exists modes (
  id           text primary key,       -- 'quick','church','travel','impress','night'
  label        text not null,
  hint         text,
  rules        jsonb default '{}',     -- {min_formality, excluded_vibes, time_of_day[], ...}
  sort_order   int default 0
);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_items_updated on items;
create trigger trg_items_updated before update on items
  for each row execute function set_updated_at();

drop trigger if exists trg_profile_updated on style_profile;
create trigger trg_profile_updated before update on style_profile
  for each row execute function set_updated_at();

-- =====================================================================
-- Storage bucket for item photos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('items', 'items', true)
on conflict (id) do nothing;

-- Policies — V1 is single-user, permissive. Tighten before adding multi-user.
drop policy if exists "items bucket read"   on storage.objects;
drop policy if exists "items bucket write"  on storage.objects;
drop policy if exists "items bucket update" on storage.objects;
drop policy if exists "items bucket delete" on storage.objects;

create policy "items bucket read"
  on storage.objects for select
  using (bucket_id = 'items');

create policy "items bucket write"
  on storage.objects for insert
  with check (bucket_id = 'items');

create policy "items bucket update"
  on storage.objects for update
  using (bucket_id = 'items');

create policy "items bucket delete"
  on storage.objects for delete
  using (bucket_id = 'items');

-- =====================================================================
-- Row Level Security — V1 open (single-user). Tighten later.
-- =====================================================================
alter table categories    disable row level security;
alter table items         disable row level security;
alter table outfits       disable row level security;
alter table style_profile disable row level security;
alter table modes         disable row level security;
