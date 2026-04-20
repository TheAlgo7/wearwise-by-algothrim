'use client';
import { useEffect } from 'react';

export function useScrollRestoration(key: string, ready = true) {
  // Restore — runs only once content is ready (items loaded)
  useEffect(() => {
    if (!ready) return;
    const saved = sessionStorage.getItem(`wearwise.scroll.${key}`);
    if (!saved) return;
    // Two rAF frames to ensure the full DOM has painted before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
      });
    });
  }, [key, ready]);

  // Save — always active
  useEffect(() => {
    const handler = () => {
      sessionStorage.setItem(`wearwise.scroll.${key}`, String(Math.round(window.scrollY)));
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [key]);
}
