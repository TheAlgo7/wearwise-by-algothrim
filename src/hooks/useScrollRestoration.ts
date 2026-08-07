'use client';
import { useEffect, useRef } from 'react';

/**
 * Put the page back where he left it.
 *
 * Two things kept defeating this, both of them scroll events we did not cause:
 *
 * 1. The App Router scrolls to the top when you navigate. That event fires
 *    while the old page is still mounted, so a plain scroll listener wrote 0
 *    over the position we wanted a fraction of a second earlier.
 * 2. Coming back, the browser resets the window to 0 before our restore runs,
 *    which wrote 0 again.
 *
 * So the position is captured on the tap that starts the navigation — in the
 * capture phase, before the router does anything — and writing is then locked
 * until the next restore. Saving during ordinary scrolling still happens, for
 * the case where the app is backgrounded rather than navigated away from.
 */
export function useScrollRestoration(key: string, ready = true) {
  const armed = useRef(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const storageKey = `wearwise.scroll.${key}`;
    const save = (y: number) => sessionStorage.setItem(storageKey, String(Math.round(y)));
    const saved = Number(sessionStorage.getItem(storageKey) ?? 0);

    let raf1 = 0, raf2 = 0;
    if (saved > 0) {
      // Two frames so the shelves have laid out before we jump, then one more
      // before listening so our own scrollTo does not re-save what it just set.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          window.scrollTo({ top: saved, behavior: 'instant' });
          requestAnimationFrame(() => { armed.current = true; });
        });
      });
    } else {
      armed.current = true;
    }

    /**
     * A jump from deep in the page straight to 0 is the router, not a thumb.
     *
     * Relying on catching the tap first turned out to be fragile — which of
     * pointerdown/mousedown/touchstart actually fires varies by device and by
     * emulation, and missing it meant the router's scroll-to-top wrote 0 over
     * the position every single time. Recognising the jump itself needs no
     * input events at all. Scrolling up by hand passes through the middle of
     * the page, so it never looks like this.
     */
    const PROGRAMMATIC_JUMP_FROM = 400;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const jumpedToTop = y === 0 && lastY > PROGRAMMATIC_JUMP_FROM;
      lastY = y;
      if (jumpedToTop) {
        armed.current = false; // lock; the position we already saved is the real one
        return;
      }
      if (armed.current) save(y);
    };

    /**
     * A tap on any link is the last honest reading of where he was.
     *
     * All three input events, because which one arrives depends on the device:
     * a real finger on the S24 fires touchstart and pointerdown, a mouse fires
     * pointerdown and mousedown, and some touch-emulating stacks fire only
     * touchstart. Missing the event means the router's scroll-to-top writes 0
     * over the saved position and the list always comes back at the top.
     */
    const onTapLink = (e: Event) => {
      // Already locked means a jump was detected and the value on disk is the
      // good one; saving the post-jump position here would undo that.
      if (!armed.current) return;
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.('a[href]')) return;
      save(window.scrollY);
      armed.current = false; // lock: the router's scroll-to-top must not win
    };

    const TAP_EVENTS = ['pointerdown', 'mousedown', 'touchstart'] as const;

    window.addEventListener('scroll', onScroll, { passive: true });
    for (const ev of TAP_EVENTS) document.addEventListener(ev, onTapLink, true);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('scroll', onScroll);
      for (const ev of TAP_EVENTS) document.removeEventListener(ev, onTapLink, true);
      armed.current = false;
    };
  }, [key, ready]);
}
