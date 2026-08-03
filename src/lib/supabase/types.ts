import type { Fit, LayerType, Sleeve } from '@/lib/constants';

export interface Category {
  id: string;
  name: string;
  layer_type: LayerType;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  category_id: string;
  image_url: string | null;
  image_path: string | null;
  primary_color: string | null;
  secondary_colors: string[];
  fit: Fit | null;
  sleeve_length: Sleeve | null;
  can_be_worn_open: boolean;
  material: string[];
  formality: number | null;
  vibe: string[];
  min_temp_c: number | null;
  max_temp_c: number | null;
  occasions: string[];
  times_of_day: string[];
  notes: string | null;
  times_worn: number;
  last_worn_at: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
}

export interface OutfitContext {
  temp_c?: number;
  condition?: string;
  season?: 'summer' | 'monsoon' | 'autumn' | 'winter';
  environment?: 'outdoor' | 'indoor-ac';
  event?: string;
  mode?: string;
  city?: string;
  time_of_day?: string;
  trip_location?: string;
}

export interface Outfit {
  id: string;
  items: string[];
  context: OutfitContext;
  ai_reasoning: string | null;
  confidence: number | null;
  rating: number | null;
  worn_at: string | null;
  is_saved: boolean;
  created_at: string;
  /** Look name, e.g. "Sunday Church". Null for one-off generated outfits. */
  name: string | null;
  /** Shows on the saved-looks shelf rather than only in history. */
  is_preset: boolean;
  /** Season this look is for; null means all-season. */
  season: 'summer' | 'monsoon' | 'autumn' | 'winter' | null;
  sort_order: number;
  /** Who built it: Gaurav or Ishita. */
  created_by: 'owner' | 'partner';
  /** Message attached to the look, used for Ishita's picks. */
  note: string | null;
  /** When Gaurav first opened a partner pick. */
  seen_at: string | null;
  /** Gaurav's response to a partner pick. */
  reaction: string | null;
}

export interface AvoidedCombination {
  reason: string;
  items: string[];
}

export interface SignatureCombo {
  name: string;
  items: string[];
  vibe?: string;
}

export interface StyleProfile {
  id: string;
  user_name: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_type: string | null;
  preferred_fits: string[];
  preferred_colors: string[];
  avoided_colors: string[];
  avoided_combinations: AvoidedCombination[];
  signature_combos: SignatureCombo[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModeRules {
  min_formality?: number;
  max_formality?: number;
  excluded_vibes?: string[];
  required_vibes_any?: string[];
  time_of_day?: string[];
  prefer_layering?: boolean;
  favor_tags?: string[];
  favor_signature?: boolean;
  avoid_recently_worn_days?: number;
  palette_boost?: 'dark' | 'light';
  excluded_layers?: string[];       // layer_types to hard-exclude (e.g. 'timepiece' for home)
  footwear_vibes_any?: string[];    // require footwear to match at least one vibe
}

export interface Mode {
  id: string;
  label: string;
  hint: string | null;
  rules: ModeRules;
  sort_order: number;
}

export const STYLE_PROFILE_ID = '00000000-0000-0000-0000-000000000001';
