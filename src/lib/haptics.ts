/**
 * A single light tick on the decisions that matter: taking an outfit, moving
 * to the next one. Android Chrome (his S24) honours it; iOS Safari has no
 * vibration API, so on Ishita's iPhone this is silently nothing.
 */
export function tick(ms = 8): void {
  if (typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* some browsers throw outside a user gesture; a missed tick is fine */
  }
}
