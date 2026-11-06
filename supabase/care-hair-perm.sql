-- ── Care: hair after the cold perm (6 Nov 2026) ────────────────────────────
--
-- Safe to run any number of times: every statement checks before it writes.
-- Nothing here touches skin or body data, and the deny-by-default privacy from
-- care.sql is unchanged (RLS on, no policies). Do not add one.
--
-- Run in the Supabase SQL editor, or: psql "$DATABASE_URL" -f supabase/care-hair-perm.sql

-- 1. Profile columns. Additive with defaults, so the app works before and
--    after it deploys: the API reads `select *` and ignores what it does not use.
alter table care_profile add column if not exists perm_on       timestamptz;
alter table care_profile add column if not exists wash_min_days smallint not null default 3;
alter table care_profile add column if not exists wash_max_days smallint not null default 4;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'care_profile_wash_window') then
    alter table care_profile add constraint care_profile_wash_window check (
      wash_min_days between 1 and 14
      and wash_max_days between 1 and 14
      and wash_min_days <= wash_max_days
    );
  end if;
end $$;

-- 2. His hair: fine, naturally straight and silky, cold-permed 23 Oct 2026 at
--    7:30 pm IST, going for messy textured loose waves. Written once; the guard
--    stops a re-run from undoing anything he changes later in the app.
update care_profile
set hair_type      = 'fine-straight-silky',
    perm_on        = timestamptz '2026-10-23 19:30:00+05:30',
    hairstyle_goal = 'Messy, textured loose waves',
    updated_at     = now()
where perm_on is distinct from timestamptz '2026-10-23 19:30:00+05:30';

-- 3. Owned products. Each is added only when no row with the same brand, kind
--    and name exists. The 50 ml bottles are Moxie's travel sizes.
insert into care_products
  (name, brand, domain, kind, step_order, areas, amount, directions, frequency, time_of_day, cautions)
select v.name, v.brand, 'hair', v.kind, v.step_order, v.areas, v.amount, v.directions,
       'wash-day', array['pm'], v.cautions
from (values
  ('Gentle Cleansing Shampoo (50 ml)', 'Moxie', 'shampoo', 1, array['scalp'], 'Small coin',
   'Sulphate-free everyday wash. Fingertips on the scalp only; the rinse cleans the lengths.',
   array[]::text[]),
  ('Ultra Hydrating Conditioner (50 ml)', 'Moxie', 'conditioner', 2, array['lengths', 'ends'], 'Coin-sized',
   'Rinse-out. Mid-lengths to ends, never the scalp. Two minutes, then rinse.',
   array[]::text[]),
  -- step_order 0: it goes on first, on wet hair, before any other styling.
  ('Super Defining Curl Cream (50 ml)', 'Moxie', 'styling', 0, array['lengths'], 'Pea-sized',
   'On wet hair straight after the conditioner. Smooth over the lengths, scrunch upward, hands off until dry.',
   array['Fine hair: start small. Too much weighs the waves down.'])
) as v(name, brand, kind, step_order, areas, amount, directions, cautions)
where not exists (
  select 1 from care_products p
  where lower(coalesce(p.brand, '')) = lower(v.brand)
    and p.kind = v.kind
    and lower(p.name) = lower(v.name)
);

-- 4. The everyday-shampoo gap is filled. Archive the wishlist row (not delete).
update care_products
set archived = true
where wishlist and not archived
  and domain = 'hair' and kind = 'shampoo' and name = 'Gentle everyday shampoo';

-- 5. Styling stays, as options. These directions assumed a blow-dried quiff.
update care_products
set directions = 'Optional. 2-3 sprays on damp waves, scrunch, air-dry. Salt dries permed hair, so not every day.'
where domain = 'hair' and kind = 'styling' and brand = 'Arata' and not wishlist;

update care_products
set directions = 'Optional. A rice grain, warmed between the fingers, pinched into the ends for separation. Never on the scalp.'
where domain = 'hair' and kind = 'styling' and brand = 'Beardo' and not wishlist;

update care_products
set directions = 'Only if you diffuse or blow-dry. Permed hair does best air-dried, so this is not urgent.'
where domain = 'hair' and wishlist and name = 'Heat protectant spray';

-- 6. The outfit stylist's copy of his hair. The saved style profile overrides
--    the hardcoded one in lib/style-profile.ts and still said "Wolf Cut".
update style_profile
set body_type = replace(body_type, 'Wolf Cut hair growing out.', 'Cold-permed loose waves since 23 Oct 2026.'),
    updated_at = now()
where body_type like '%Wolf Cut hair growing out.%';

-- 7. The last wash he reported: shampoo and conditioner, 25 Oct 2026, 10 pm IST.
--    It is here because he logged it. No other wash is assumed.
insert into care_logs (action, domain, area, note, done_at)
select 'shampoo', 'hair', 'scalp', 'Shampoo and conditioner.', timestamptz '2026-10-25 22:00:00+05:30'
where not exists (
  select 1 from care_logs
  where action = 'shampoo' and done_at = timestamptz '2026-10-25 22:00:00+05:30'
);
