export type { Category, Item, Outfit, OutfitContext, StyleProfile, Mode, ModeRules, AvoidedCombination, SignatureCombo } from '@/lib/supabase/types';
export { STYLE_PROFILE_ID } from '@/lib/supabase/types';
export type { LayerType, Fit, Sleeve, Vibe, Occasion, TimeOfDay, ModeId, Environment } from '@/lib/constants';

export interface WeatherSnapshot {
  temp_c: number;
  feels_like_c: number;
  condition: string;
  icon: string;
  humidity: number;
  wind_kph: number;
  city: string;
  country: string;
  is_night: boolean;
  fetched_at: string;
}

export interface GeneratedOutfit {
  items: string[];       // item ids
  reasoning: string;
  confidence: number;    // 0-1
}

export interface GenerateRequest {
  mode: string;
  environment: 'outdoor' | 'indoor-ac';
  event?: string;
  trip_city?: string;
  override_temp_c?: number;
}

export interface GenerateResponse {
  outfits: GeneratedOutfit[];
  context: {
    temp_c: number;
    condition: string;
    time_of_day: string;
    environment: string;
    mode: string;
    city: string;
  };
  candidate_count: number;
}
