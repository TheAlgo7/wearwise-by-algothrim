'use client';

import { OneUIHeader } from '@/components/oneui';
import { MODES } from '@/lib/constants';
import {
  Briefcase,
  ChevronRight,
  Church,
  Clock3,
  Dumbbell,
  History,
  Home,
  MessageCircle,
  Moon,
  Plane,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const MODE_ICONS: Record<string, LucideIcon> = {
  quick: Zap,
  home: Home,
  casual: Users,
  smart: Briefcase,
  gym: Dumbbell,
  church: Church,
  travel: Plane,
  impress: Star,
  night: Moon,
  describe: MessageCircle,
};

const GROUPS = [
  { label: 'Everyday', ids: ['home', 'casual', 'gym'] },
  { label: 'Plans', ids: ['smart', 'church', 'travel'] },
  { label: 'Intent', ids: ['impress', 'night'] },
] as const;

const modeById = new Map(MODES.map((m) => [m.id, m]));

export default function ModesPage() {
  const router = useRouter();
  const quick = modeById.get('quick')!;
  const describe = modeById.get('describe')!;

  const openMode = (id: string) => router.push(`/?mode=${id}`);

  return (
    <main className="min-h-dvh pb-4">
      <OneUIHeader
        eyebrow="PRESETS"
        title="Plan a fit"
        subtitle="Pick the situation. WearWise handles the judgment."
      />
      <div className="reach-zone">
        <section className="grid grid-cols-2 gap-3">
          <button onClick={() => openMode(quick.id)} className="press text-left">
            <div className="glass-card min-h-[132px] p-4 flex flex-col justify-between">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-[#E2335D]/18">
                <Zap size={20} style={{ color: '#FF86A0' }} />
              </div>
              <div>
                <p className="text-oneui-h text-[#FFEDE8]">{quick.label}</p>
                <p className="mt-1 text-oneui-cap text-[#FFD9DA]/60">{quick.hint}</p>
              </div>
            </div>
          </button>

          <button onClick={() => openMode(describe.id)} className="press text-left">
            <div className="glass-card min-h-[132px] p-4 flex flex-col justify-between">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-white/[0.06]">
                <MessageCircle size={20} style={{ color: '#FF86A0' }} />
              </div>
              <div>
                <p className="text-oneui-h text-[#FFEDE8]">{describe.label}</p>
                <p className="mt-1 text-oneui-cap text-[#FFD9DA]/60">Custom context</p>
              </div>
            </div>
          </button>
        </section>

        <Link href="/outfits" className="press block">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-white/[0.06]">
              <History size={20} style={{ color: '#FF86A0' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-oneui-h text-[#FFEDE8]">Outfit history</div>
              <div className="text-oneui-cap text-[#FFD9DA]/60">Recent worn fits and AI reasoning</div>
            </div>
            <ChevronRight size={18} style={{ color: '#FF86A0' }} />
          </div>
        </Link>

        {GROUPS.map((group) => (
          <section key={group.label} className="pt-1">
            <div className="mb-2 px-1 flex items-center gap-2">
              <Clock3 size={13} style={{ color: '#FF86A0' }} />
              <p className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase">
                {group.label}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {group.ids.map((id) => {
                const mode = modeById.get(id)!;
                const Icon = MODE_ICONS[mode.id] ?? Sparkles;
                return (
                  <button
                    key={mode.id}
                    onClick={() => openMode(mode.id)}
                    className="press text-left"
                  >
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 bg-[#E2335D]/12">
                        <Icon size={19} style={{ color: '#FF86A0' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[18px] leading-[23px] font-semibold text-[#FFEDE8]">
                          {mode.label}
                        </div>
                        <div className="text-oneui-cap text-[#FFD9DA]/60 truncate">{mode.hint}</div>
                      </div>
                      <ChevronRight size={18} style={{ color: '#FF86A0' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
