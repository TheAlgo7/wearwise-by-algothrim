import type { Role } from '@/lib/roles';
import type { Season } from '@/lib/season';

/**
 * Greeting engine.
 *
 * The old version was a fixed if-ladder on the hour, so the same eight strings
 * cycled forever. This builds a candidate pool from everything the app knows
 * right now (hour, weekday, season, weather, wardrobe size) and picks one that
 * has not shown up in the last few opens.
 *
 * Voice, owner: composed and dry. It never explains itself and never cheers.
 * Voice, partner: warm. She is a guest in his wardrobe and should feel wanted.
 */

export interface GreetingContext {
  role: Role;
  date: Date;
  season: Season;
  tempC?: number | null;
  condition?: string | null;
  /** Number of looks Ishita has sent that he has not opened yet. */
  unseenPicks?: number;
  /** Whether the viewer has any items at all. */
  itemCount?: number;
}

type Bucket = 'dawn' | 'early' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late';

function bucketFor(h: number): Bucket {
  if (h >= 4 && h < 6) return 'dawn';
  if (h >= 6 && h < 9) return 'early';
  if (h >= 9 && h < 12) return 'morning';
  if (h >= 12 && h < 14) return 'midday';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 20) return 'evening';
  if (h >= 20 && h < 23) return 'night';
  return 'late';
}

const OWNER_TIME: Record<Bucket, string[]> = {
  dawn: [
    'Still up?',
    'The quiet hours.',
    'Nobody dresses at 5am for no reason.',
    'Early, even for you.',
  ],
  early: [
    'Early start.',
    'Morning, Gaurav.',
    'First call of the day.',
    'Beat the heat, get dressed.',
    'Let us make this quick.',
  ],
  morning: [
    'Morning, Gaurav.',
    'Good morning.',
    'Right, what are we wearing?',
    'The day is open.',
    'Fresh slate.',
  ],
  midday: [
    'Midday already.',
    'Half the day is gone.',
    'Afternoon is coming.',
    'Lunch hour.',
  ],
  afternoon: [
    'Afternoon, Gaurav.',
    'Plans changed?',
    'Second look of the day?',
    'Still going.',
  ],
  evening: [
    'Evening plans?',
    'Golden hour.',
    'Going somewhere?',
    'Evening, Gaurav.',
    'Time to change.',
  ],
  night: [
    'Night out?',
    'Something for tonight.',
    'Late plans.',
    'Dressing up?',
  ],
  late: [
    'Night owl mode.',
    'Planning tomorrow already?',
    'Late one.',
    'Everyone else is asleep.',
  ],
};

const OWNER_SEASON: Record<Season, string[]> = {
  summer: ['Another hot one.', 'Dress light today.', 'The heat is winning.'],
  monsoon: ['Wet season rules apply.', 'Something that dries fast.', 'Monsoon dressing.'],
  autumn: ['Best weather of the year.', 'Finally, good weather.', 'You can wear anything today.'],
  winter: ['Cold out. Layer up.', 'Winter is here.', 'Time for the good jackets.'],
};

const OWNER_WEATHER: Array<{ when: (c: GreetingContext) => boolean; lines: string[] }> = [
  {
    when: (c) => typeof c.tempC === 'number' && c.tempC >= 40,
    lines: ['Forty plus. Be sensible.', 'Brutal out there.', 'It is too hot for opinions.'],
  },
  {
    when: (c) => typeof c.tempC === 'number' && c.tempC <= 10,
    lines: ['Properly cold today.', 'This is jacket weather.', 'Single digits.'],
  },
  {
    when: (c) => /rain|drizzle|shower|thunder/i.test(c.condition ?? ''),
    lines: ['It is raining.', 'Wet out there.', 'Rain changes the plan.'],
  },
];

const OWNER_DAY: Record<number, string[]> = {
  0: ['Sunday.', 'Church first.', 'Sunday, so you know the drill.'],
  1: ['Monday. Start clean.', 'New week.'],
  5: ['Friday.', 'Friday, finally.'],
  6: ['Saturday.', 'No rules today.'],
};

const PARTNER_TIME: Record<Bucket, string[]> = {
  dawn: ['You are up early, Ishita.', 'Can you not sleep either?', 'The world is still asleep.'],
  early: ['Good morning, Ishita.', 'Morning, love.', 'Early bird.', 'Hi Ishita. Coffee first?'],
  morning: ['Hi Ishita.', 'Good morning, Ishita.', 'Morning. He needs your eye today.', 'Hello, you.'],
  midday: ['Hi Ishita.', 'Afternoon already.', 'Taking a break?', 'Hello, love.'],
  afternoon: ['Afternoon, Ishita.', 'Hi love.', 'Back again?', 'Hello, Ishita.'],
  evening: ['Evening, Ishita.', 'Hi love.', 'Dressing him for tonight?', 'Good evening, you.'],
  night: ['Hi Ishita.', 'Evening, love.', 'Late night styling?', 'Hello, you.'],
  late: ['Still awake, Ishita?', 'Late one, love.', 'Go to sleep soon.', 'Hi. It is late.'],
};

const PARTNER_WARM = [
  'His wardrobe missed you.',
  'You have better taste than him anyway.',
  'He will wear whatever you pick.',
  'The good eye has arrived.',
  'Welcome back, Ishita.',
];

const PARTNER_SEASON: Record<Season, string[]> = {
  summer: ['Keep him cool today.', 'Pick something light for him.'],
  monsoon: ['It is wet out. Something practical.', 'Rain today. Choose wisely.'],
  autumn: ['Good weather for him.', 'He can wear anything today.'],
  winter: ['Keep him warm, Ishita.', 'Cold out. Layer him up.'],
};

const RECENT_KEY = 'wearwise.greeting.recent';
const RECENT_MEMORY = 6;

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function rememberGreeting(line: string) {
  if (typeof window === 'undefined') return;
  try {
    const next = [line, ...readRecent().filter((l) => l !== line)].slice(0, RECENT_MEMORY);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked; greeting variety is not worth throwing over */
  }
}

/**
 * Builds the candidate pool. Contextual lines (weather, season, day, unseen
 * picks) are pushed in twice so they surface more often than generic ones
 * without ever fully crowding them out.
 */
function candidates(ctx: GreetingContext): string[] {
  const bucket = bucketFor(ctx.date.getHours());
  const pool: string[] = [];

  if (ctx.role === 'partner') {
    pool.push(...PARTNER_TIME[bucket]);
    pool.push(...PARTNER_WARM);
    pool.push(...PARTNER_SEASON[ctx.season], ...PARTNER_SEASON[ctx.season]);
    return pool;
  }

  pool.push(...OWNER_TIME[bucket]);

  if (ctx.unseenPicks && ctx.unseenPicks > 0) {
    const line = ctx.unseenPicks === 1 ? 'Ishita picked something.' : `Ishita left you ${ctx.unseenPicks} looks.`;
    // Strong signal: weight it heavily, he should see it.
    pool.push(line, line, line, line);
  }

  const day = OWNER_DAY[ctx.date.getDay()];
  if (day) pool.push(...day, ...day);

  for (const rule of OWNER_WEATHER) {
    if (rule.when(ctx)) pool.push(...rule.lines, ...rule.lines);
  }

  pool.push(...OWNER_SEASON[ctx.season], ...OWNER_SEASON[ctx.season]);

  if (ctx.itemCount === 0) return ['Nothing in here yet.'];

  return pool;
}

/**
 * Pick a greeting. Deterministic per call site is not wanted here: the point is
 * that it feels different each time the app is opened.
 */
export function pickGreeting(ctx: GreetingContext): string {
  const pool = candidates(ctx);
  const recent = readRecent();
  const fresh = pool.filter((l) => !recent.includes(l));
  const from = fresh.length > 0 ? fresh : pool;
  const line = from[Math.floor(Math.random() * from.length)] ?? 'Hello.';
  rememberGreeting(line);
  return line;
}
