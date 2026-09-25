export type CareDomain = 'skin' | 'hair' | 'body' | 'tool';
export type Phase = 'morning' | 'evening';

/** Persistent facts that change what is safe to recommend. */
export interface CareProfile {
  id: string;
  skin_type: string;
  skin_concerns: string[];
  sensitivities: string[];
  hair_type: string;
  hair_hold: string;
  /** 'active' | 'occasional' | 'none' */
  dandruff: string;
  hairstyle_goal: string | null;
  growth_started_on: string | null;
  share_with_partner: boolean;
}

export interface CareProduct {
  id: string;
  name: string;
  brand: string | null;
  domain: CareDomain;
  kind: string;
  step_order: number | null;
  actives: string[];
  areas: string[];
  amount: string | null;
  directions: string | null;
  frequency: string;
  time_of_day: string[];
  conflicts: string[];
  cautions: string[];
  image_url: string | null;
  opened_on: string | null;
  expires_on: string | null;
  /** True when this is a gap he has not bought yet, not something he owns. */
  wishlist: boolean;
  needs_detail: string | null;
  archived: boolean;
}

export interface CareLog {
  id: string;
  action: string;
  domain: string;
  area: string | null;
  product_id: string | null;
  note: string | null;
  severity: number | null;
  done_at: string;
}

export interface CareStep {
  key: string;
  title: string;
  productId: string | null;
  productName: string | null;
  /** Amount and handling, e.g. "2-3 drops, pat in". */
  detail: string | null;
  /** Answers "why this step", shown on demand rather than by default. */
  why: string;
  /** Skippable without breaking the routine. */
  optional: boolean;
  /** Set when the step needs something he does not own yet. */
  missing: string | null;
}

export interface DueItem {
  key: string;
  label: string;
  /** Negative means overdue. Null when there is no meaningful date. */
  inDays: number | null;
  detail: string;
  domain: CareDomain;
  /**
   * Nothing logged for far longer than the cadence, so the date is unknown
   * rather than overdue. Shown quietly, never as a crimson overdue count.
   */
  stale?: boolean;
  /** ISO timestamp of the log this date is counted from. */
  lastDone?: string | null;
  /** What to record when he says it is done. Absent for things like a wash. */
  log?: { action: 'shave' | 'trim' | 'haircut'; area: string; domain: 'hair' | 'body' };
}

export interface CarePlan {
  phase: Phase;
  /** "Normal day · Staying home · Humid" */
  headline: string;
  /** Conditions the routine is reacting to, e.g. "Post-shave". */
  flags: string[];
  steps: CareStep[];
  minutes: number;
  due: DueItem[];
  /** Steps already logged today, so the card can collapse. */
  doneKeys: string[];
}

/** What the Today screen needs to draw its one compact card. */
export interface CareSummary {
  phase: Phase;
  stepCount: number;
  minutes: number;
  titles: string[];
  complete: boolean;
  /** The single most pressing due item, if any is close. */
  nextDue: DueItem | null;
}
