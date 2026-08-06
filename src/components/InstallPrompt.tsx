'use client';

import { OneUIButton, Squircle } from '@/components/oneui';
import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wearwise.install.dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS predates the display-mode media query for home-screen apps.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac; touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Install prompt, both ways.
 *
 * Gaurav is on Android, where `beforeinstallprompt` fires and one tap installs
 * the app. Ishita is on an iPhone, where that event **does not exist** — Safari
 * has never implemented it. The original component listened for it and nothing
 * else, so on her phone this never appeared and the only route to a home-screen
 * icon was knowing to press Share and scroll to "Add to Home Screen".
 *
 * iOS therefore gets instructions instead of a button, because instructions are
 * the only thing the platform allows.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isStandalone()) return;

    if (isIOS()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIosHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setIosHint(false);
  };

  if (!deferred && !iosHint) return null;

  return (
    <div
      className="fixed inset-x-3 z-40 mx-auto max-w-xl"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}
    >
      <Squircle variant="glass" className="animate-oneui-pop flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-crimson-400 text-white">
          {iosHint ? <Share size={18} aria-hidden /> : <Download size={18} aria-hidden />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-oneui-body font-semibold text-fog-100">Add WearWise to your home screen</div>
          <div className="text-[12px] leading-5 text-fog-400">
            {iosHint
              ? 'Tap Share, then "Add to Home Screen".'
              : 'Opens like an app, works offline.'}
          </div>
        </div>

        {!iosHint && deferred && (
          <OneUIButton
            size="sm"
            intent="primary"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
          >
            Install
          </OneUIButton>
        )}

        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fog-400 transition-colors hover:text-fog-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        >
          <X size={16} aria-hidden />
        </button>
      </Squircle>
    </div>
  );
}
