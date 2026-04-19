-- =====================================================================
-- WearWise — Seed data
-- Run AFTER schema.sql. Safe to re-run (uses ON CONFLICT).
-- =====================================================================

-- Categories (pre-populated so the Add Item form has options)
insert into categories (name, layer_type, icon, sort_order) values
  ('T-shirt',            'base',      'shirt',         10),
  ('Polo',               'base',      'shirt',         11),
  ('Tank / Vest',        'base',      'shirt',         12),
  ('Shirt (Button-down)','mid',       'shirt',         20),
  ('Sweatshirt',         'mid',       'shirt',         21),
  ('Sweater / Knit',     'mid',       'shirt',         22),
  ('Overshirt',          'mid',       'shirt',         23),
  ('Jacket',             'outer',     'jacket',        30),
  ('Blazer',             'outer',     'jacket',        31),
  ('Coat',               'outer',     'jacket',        32),
  ('Hoodie',             'outer',     'jacket',        33),
  ('Trousers',           'bottom',    'tangent',       40),
  ('Jeans',              'bottom',    'tangent',       41),
  ('Cargos',             'bottom',    'tangent',       42),
  ('Shorts',             'bottom',    'tangent',       43),
  ('Joggers',            'bottom',    'tangent',       44),
  ('Sneakers',           'footwear',  'footprints',    50),
  ('Formal Shoes',       'footwear',  'footprints',    51),
  ('Boots',              'footwear',  'footprints',    52),
  ('Sandals / Slides',   'footwear',  'footprints',    53),
  ('Watch',              'timepiece', 'watch',         60),
  ('Glasses',            'eyewear',   'glasses',       61),
  ('Sunglasses',         'eyewear',   'glasses',       62),
  ('Cap / Hat',          'headwear',  'circle',        63),
  ('Belt',               'accessory', 'minus',         64),
  ('Bag',                'accessory', 'briefcase',     65),
  ('Chain / Necklace',   'jewelry',   'link',          66),
  ('Ring',               'jewelry',   'circle-dot',    67),
  ('Bracelet',           'jewelry',   'circle',        68)
on conflict (name) do nothing;

-- Modes (preset rule sets consumed by filter engine + UI)
insert into modes (id, label, hint, rules, sort_order) values
  ('quick', 'Quick Fit', 'Something in 2 seconds',
    '{"min_formality":1,"max_formality":5,"excluded_vibes":[]}',
    1),
  ('church', 'Church', 'Sunday · modest · clean',
    '{"min_formality":3,"excluded_vibes":["gym","lounge","party"],"required_vibes_any":["clean","smart-casual","formal"],"time_of_day":["morning"]}',
    2),
  ('travel', 'Travel', 'Comfort · layering · repeatable',
    '{"min_formality":1,"max_formality":4,"prefer_layering":true,"favor_tags":["travel","comfortable"]}',
    3),
  ('impress', 'Impress', 'Signature combos only',
    '{"min_formality":4,"favor_signature":true,"avoid_recently_worn_days":7}',
    4),
  ('night', 'Night', 'Dark palette · evening',
    '{"min_formality":2,"palette_boost":"dark","time_of_day":["evening","night"]}',
    5)
on conflict (id) do update
  set label = excluded.label,
      hint = excluded.hint,
      rules = excluded.rules,
      sort_order = excluded.sort_order;

-- Style profile — singleton row (edit via the Profile page later)
insert into style_profile (id, user_name, preferred_fits, preferred_colors, avoided_colors)
values (
  '00000000-0000-0000-0000-000000000001',
  'Gaurav Kumar',
  array['oversized','regular','bootcut','straight'],
  array['black','white','cream','beige','olive','charcoal','navy'],
  array[]::text[]
)
on conflict (id) do nothing;
