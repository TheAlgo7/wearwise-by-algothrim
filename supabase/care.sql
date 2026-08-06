-- ── Care ──────────────────────────────────────────────────────────────────
--
-- Skin, hair and body. A second daily decision system alongside the wardrobe.
--
-- SECURITY, AND WHY THIS SCHEMA LOOKS DIFFERENT FROM THE OTHERS.
--
-- Every existing table carries an `anon_read` policy with `using (true)`, so
-- the publishable key that ships inside the client bundle can read all of it.
-- That is a defensible trade for t-shirts. It is not defensible for shaving,
-- intimate grooming, skin reactions or photographs of his scalp: Ishita's
-- browser holds that same key, and a fetch from her devtools console would
-- walk straight past every proxy rule and every piece of UI gating.
--
-- So these tables get RLS enabled and *no policies at all*. Deny by default.
-- Neither `anon` nor `authenticated` can see a single row. Access is only ever
-- through the service-role client in /api/care, which checks the owner cookie
-- first. Do not add an anon policy here to make a client-side read work.

create extension if not exists pgcrypto;

-- ── Profile ───────────────────────────────────────────────────────────────
-- Persistent facts that change what is safe to recommend.
create table if not exists care_profile (
  id                 uuid primary key default gen_random_uuid(),
  -- One row, enforced. `unique` on a column that is always true.
  singleton          boolean not null default true unique,

  skin_type          text not null default 'combination',
  skin_concerns      text[] not null default '{}',
  sensitivities      text[] not null default '{}',

  hair_type          text not null default 'fine-straight',
  -- How well the hair holds a shape without product. Drives styling advice.
  hair_hold          text not null default 'low',
  -- 'active' | 'occasional' | 'none'. Decides anti-dandruff wash frequency;
  -- a treatment shampoo is not an everyday shampoo.
  dandruff           text not null default 'occasional',

  hairstyle_goal     text,
  growth_started_on  date,

  -- Off. Turning it on exposes only a short hairstyle status line, never logs.
  share_with_partner boolean not null default false,

  updated_at         timestamptz not null default now(),
  constraint care_profile_singleton check (singleton)
);

-- ── Products ──────────────────────────────────────────────────────────────
create table if not exists care_products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text,
  -- 'skin' | 'hair' | 'body' | 'tool'
  domain       text not null,
  -- 'cleanser' | 'serum' | 'moisturiser' | 'sunscreen' | 'shampoo' |
  -- 'conditioner' | 'styling' | 'wash' | 'razor' | 'trimmer' | 'accessory'
  kind         text not null,
  -- Position within its routine. Lower goes on first.
  step_order   int,
  actives      text[] not null default '{}',
  areas        text[] not null default '{}',
  amount       text,
  directions   text,
  -- 'daily' | 'wash-day' | 'as-needed' | 'weekly' | 'twice-weekly'
  frequency    text not null default 'as-needed',
  -- 'am' | 'pm'
  time_of_day  text[] not null default '{}',
  -- Free-form tags the engine matches against, e.g. 'post-shave'.
  conflicts    text[] not null default '{}',
  cautions     text[] not null default '{}',
  image_url    text,
  opened_on    date,
  expires_on   date,
  -- True when the product is a known gap rather than something he owns.
  wishlist     boolean not null default false,
  -- Set when the record is incomplete and the app should ask him for detail.
  needs_detail text,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists care_products_domain_idx on care_products (domain, archived);

-- ── Logs ──────────────────────────────────────────────────────────────────
-- Every completed action. The engine reads almost all of its state from here,
-- which is why "when did I last do X" stops being something he has to recall.
create table if not exists care_logs (
  id         uuid primary key default gen_random_uuid(),
  -- 'cleanse' | 'serum' | 'moisturise' | 'sunscreen' | 'shampoo' |
  -- 'conditioner' | 'style' | 'shave' | 'trim' | 'haircut' | 'hair_spa' |
  -- 'body_wash' | 'exfoliate' | 'reaction'
  action     text not null,
  domain     text not null,
  -- Areas grow and tolerate shaving differently, so they are logged apart.
  -- One generic "full body due" reminder would be wrong most of the time.
  -- 'face' | 'scalp' | 'underarms' | 'chest' | 'legs' | 'intimate'
  area       text,
  product_id uuid references care_products(id) on delete set null,
  note       text,
  -- Reactions only: 1 mild, 2 stinging, 3 painful or broken out.
  severity   int,
  done_at    timestamptz not null default now()
);

create index if not exists care_logs_action_idx on care_logs (action, done_at desc);
create index if not exists care_logs_done_idx   on care_logs (done_at desc);

-- ── Photos ────────────────────────────────────────────────────────────────
-- Monthly growth tracking. Private, same as everything else here.
create table if not exists care_photos (
  id         uuid primary key default gen_random_uuid(),
  angle      text not null,
  image_path text not null,
  taken_on   date not null default current_date,
  note       text,
  created_at timestamptz not null default now()
);

-- ── Deny by default ───────────────────────────────────────────────────────
alter table care_profile  enable row level security;
alter table care_products enable row level security;
alter table care_logs     enable row level security;
alter table care_photos   enable row level security;

-- Deliberately no policies. See the note at the top of this file.
revoke all on care_profile,  care_products, care_logs, care_photos from anon, authenticated;
