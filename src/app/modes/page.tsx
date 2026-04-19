'use client';

import { OneUIHeader } from '@/components/oneui';
import { MODES } from '@/lib/constants';
import { ChevronRight, History, Zap, Church, Plane, Star, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const MODE_ICONS: Record<string, LucideIcon> = {
  quick:   Zap,
  church:  Church,
  travel:  Plane,
  impress: Star,
  night:   Moon,
};

export default function ModesPage() {
  const router = useRouter();
  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="PRESETS"
        title="Pick a vibe"
      />
      <div className="reach-zone">
        <div className="flex flex-col gap-2.5">
          {MODES.map((m) => {
            const Icon = MODE_ICONS[m.id] ?? Zap;
            return (
              <button
                key={m.id}
                onClick={() => router.push(`/?mode=${m.id}`)}
                className="press text-left"
              >
                <div className="glass-card p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-[#E2335D]/15"
                  >
                    <Icon size={20} style={{ color: '#E2335D' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-oneui-h text-[#FFEDE8]">{m.label}</div>
                    <div className="text-oneui-cap text-[#FFD9DA]/60">{m.hint}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: '#FF86A0' }} />
                </div>
              </button>
            );
          })}
        </div>

        <Link href="/outfits" className="press block mt-2">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-white/[0.06]">
              <History size={20} style={{ color: '#FF86A0' }} />
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
