'use client';
import { useEffect } from 'react';

export function useScrollRestoration(key: string) {
  useEffect(() => {
    const saved = sessionStorage.getItem(`wearwise.scroll.${key}`);
    if (saved) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
    }
    const handler = () => {
      sessionStorage.setItem(`wearwise.scroll.${key}`, String(Math.round(window.scrollY)));
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [key]);
}
