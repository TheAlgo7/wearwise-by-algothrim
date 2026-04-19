'use client';

import { OneUIHeader, Squircle } from '@/components/oneui';
import { MODES } from '@/lib/constants';
import { ChevronRight, History, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ModesPage() {
  const router = useRouter();
  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="PRESETS"
        title="Pick a vibe"
        subtitle="Jump to Today with that mode already applied."
      />
      <div className="reach-zone">
        <div className="flex flex-col gap-2.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                // Store mode in sessionStorage so Home picks it up? Simpler: pass via URL
                router.push(`/?mode=${m.id}`);
              }}
              className="press text-left"
            >
              <Squircle variant="raised" className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-crimson-gradient flex items-center justify-center shrink-0 shadow-crimson-glow">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-oneui-h text-fog-100">{m.label}</div>
                  <div className="text-oneui-cap text-fog-300">{m.hint}</div>
                </div>
                <ChevronRight size={18} className="text-fog-400" />
              </Squircle>
            </button>
          ))}
        </div>

        <Link href="/outfits" className="press block mt-4">
          <Squircle variant="flat" className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-ink-300 flex items-center justify-center shrink-0">
              <History size={18} className="text-fog-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-oneui-h text-fog-100">Outfit history</div>
              <div className="text-oneui-cap text-fog-300">What you've worn recently</div>
            </div>
            <ChevronRight size={18} className="text-fog-400" />
          </Squircle>
        </Link>
      </div>
    </main>
  );
}
