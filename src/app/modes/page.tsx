'use client';

import { OneUIHeader } from '@/components/oneui';
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
              onClick={() => router.push(`/?mode=${m.id}`)}
              className="press text-left"
            >
              <div className="glass-card p-4 flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #E2335D 0%, #BB165F 100%)',
                    boxShadow: '0 0 16px rgba(226,51,93,0.4)',
                  }}
                >
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-oneui-h text-[#FFEDE8]">{m.label}</div>
                  <div className="text-oneui-cap text-[#FFD9DA]/60">{m.hint}</div>
                </div>
                <ChevronRight size={18} style={{ color: '#FF86A0' }} />
              </div>
            </button>
          ))}
        </div>

        <Link href="/outfits" className="press block mt-2">
          <div
            className="rounded-[2rem] p-4 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <History size={18} style={{ color: '#FF86A0' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-oneui-h text-[#FFEDE8]">Outfit history</div>
              <div className="text-oneui-cap text-[#FFD9DA]/60">What you've worn recently</div>
            </div>
            <ChevronRight size={18} style={{ color: '#FF86A0' }} />
          </div>
        </Link>
      </div>
    </main>
  );
}
