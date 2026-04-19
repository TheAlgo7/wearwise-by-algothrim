'use client';

import { OneUIButton, Squircle } from '@/components/oneui';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wearwise.install.dismissed';

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    // Already installed → skip
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="fixed left-3 right-3 bottom-24 z-40 max-w-xl mx-auto pointer-events-auto">
      <Squircle variant="glass" className="p-4 flex items-center gap-3 animate-oneui-pop">
        <div className="h-11 w-11 rounded-full bg-crimson-gradient flex items-center justify-center shrink-0 shadow-crimson-glow">
          <Download size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-oneui-body font-semibold text-fog-100">Install WearWise</div>
          <div className="text-oneui-cap text-fog-300">Native feel · offline · home screen</div>
        </div>
        <OneUIButton
          size="sm"
          intent="primary"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setVisible(false);
          }}
        >
          Install
        </OneUIButton>
        <button
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
          className="press h-9 w-9 rounded-full flex items-center justify-center text-fog-400 hover:text-fog-100"
        >
          <X size={16} />
        </button>
      </Squircle>
    </div>
  );
}
