'use client';

import { OneUIButton } from '@/components/oneui';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function UnlockPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || busy) return;
    setBusy(true);
    setError(false);
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    if (res?.ok) {
      router.replace('/');
      router.refresh();
    } else {
      setError(true);
      setPin('');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-8">
      <div className="h-16 w-16 rounded-full bg-crimson-400/15 flex items-center justify-center">
        <Lock size={26} className="text-crimson-300" />
      </div>
      <h1 className="text-oneui-title font-semibold text-fog-100">WearWise</h1>
      <form onSubmit={submit} className="w-full max-w-[280px] flex flex-col gap-3">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          aria-label="PIN"
          aria-invalid={error}
          className="h-12 rounded-full bg-ink-100 text-center text-[18px] tracking-[0.4em] text-fog-100 outline-none focus-visible:ring-2 focus-visible:ring-crimson-400"
        />
        {error && <p role="alert" className="text-center text-[13px] text-fog-400">That&apos;s not it.</p>}
        <OneUIButton type="submit" disabled={!pin || busy} fullWidth>
          Unlock
        </OneUIButton>
      </form>
    </main>
  );
}
