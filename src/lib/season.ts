import type { Item } from '@/types';

/**
 * North Indian seasons, which is what this wardrobe actually lives through.
 * Four is the right number: Delhi's year is a long hot season, a wet one, a
 * short pleasant one, and a genuinely cold one that needs different clothes.
 */
export const SEASONS = ['summer', 'monsoon', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export interface SeasonMeta {
  id: Season;
  label: string;
  /** Short line shown under the switch when this season is active. */
  hint: string;
  /** Typical outdoor range, used to explain the auto choice and to tag items. */
  min_c: number;
  max_c: number;
}

export const SEASON_META: Record<Season, SeasonMeta> = {
  summer:  { id: 'summer',  label: 'Summer',  hint: 'Heat first. Light, loose, breathable.', min_c: 28, max_c: 46 },
  monsoon: { id: 'monsoon', label: 'Monsoon', hint: 'Wet and humid. Quick-dry over heavy.',  min_c: 24, max_c: 36 },
  autumn:  { id: 'autumn',  label: 'Autumn',  hint: 'The easy weeks. Anything works.',       min_c: 16, max_c: 30 },
  winter:  { id: 'winter',  label: 'Winter',  hint: 'Layer up. Mid and outer come out.',     min_c: -2, max_c: 20 },
};

/** Calendar season for North India. Used when there is no temperature reading. */
export function seasonForDate(d: Date = new Date()): Season {
  const m = d.getMonth(); // 0-indexed
  if (m >= 2 && m <= 5) return 'summer';   // Mar-Jun
  if (m >= 6 && m <= 8) return 'monsoon';  // Jul-Sep
  if (m === 9 || m === 10) return 'autumn'; // Oct-Nov
  return 'winter';                          // Dec-Feb
}

/** Season implied by an actual temperature reading. */
export function seasonForTemp(tempC: number, humidity?: number): Season {
  if (tempC >= 30) return humidity !== undefined && humidity >= 70 ? 'monsoon' : 'summer';
  if (tempC >= 24) return humidity !== undefined && humidity >= 75 ? 'monsoon' : 'summer';
  if (tempC >= 17) return 'autumn';
  return 'winter';
}

/** Slack either side of a season's range before the calendar is overruled. */
const CALENDAR_TRUST_SLACK_C = 4;

/**
 * What season the app should behave as.
 *
 * Precedence: manual override, then the calendar, then temperature.
 *
 * The calendar leads on purpose. North Indian seasons are calendar events, not
 * thermometer readings: a 33°C day in August is monsoon, not summer, and no
 * humidity reading changes that. Letting live weather decide outright made
 * every dry afternoon in the rainy season report "Summer".
 *
 * Temperature only takes over when it genuinely contradicts the calendar, which
 * in practice means he is somewhere the Delhi calendar does not describe: 14°C
 * in August means Manali, and the app should say winter.
 */
export function resolveSeason(
  override: Season | null,
  weather?: { temp_c: number; humidity?: number } | null,
  now: Date = new Date()
): { season: Season; source: 'manual' | 'weather' | 'calendar' } {
  if (override) return { season: override, source: 'manual' };

  const calendar = seasonForDate(now);
  if (!weather || !Number.isFinite(weather.temp_c)) {
    return { season: calendar, source: 'calendar' };
  }

  const { min_c, max_c } = SEASON_META[calendar];
  const consistent =
    weather.temp_c >= min_c - CALENDAR_TRUST_SLACK_C &&
    weather.temp_c <= max_c + CALENDAR_TRUST_SLACK_C;

  if (consistent) return { season: calendar, source: 'calendar' };
  return { season: seasonForTemp(weather.temp_c, weather.humidity), source: 'weather' };
}

/**
 * Which seasons a garment belongs to, derived from its temperature range.
 * No schema change needed: min_temp_c / max_temp_c already encode this, and
 * every item was tagged with them at add time.
 *
 * Items with no range at all (footwear, watches, accessories) are all-season
 * on purpose — a watch does not have a season.
 */
export function seasonsForItem(item: Pick<Item, 'min_temp_c' | 'max_temp_c'>): Season[] {
  const lo = item.min_temp_c;
  const hi = item.max_temp_c;
  if (lo === null && hi === null) return [...SEASONS];

  return SEASONS.filter((s) => {
    const meta = SEASON_META[s];
    // Overlap test between the item's comfort range and the season's range.
    const itemLo = lo ?? -50;
    const itemHi = hi ?? 60;
    return itemLo <= meta.max_c && itemHi >= meta.min_c;
  });
}

export function itemSuitsSeason(item: Pick<Item, 'min_temp_c' | 'max_temp_c'>, season: Season): boolean {
  return seasonsForItem(item).includes(season);
}

/** Human label for where the current season came from. */
export function seasonSourceLabel(source: 'manual' | 'weather' | 'calendar'): string {
  if (source === 'manual') return 'Set by you';
  // Only fires when the temperature contradicts the calendar, i.e. he has travelled.
  if (source === 'weather') return 'Set by the temperature';
  return 'Normal for this time of year';
}
