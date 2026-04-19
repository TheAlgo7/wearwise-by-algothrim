'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js on mount. Only runs in production (Next.js dev mode doesn't
 * play nicely with service workers because hot-reload invalidates cached
 * chunks).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* ignore — PWA is a progressive enhancement */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
