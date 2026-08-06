'use client';

import { cn } from '@/lib/cn';
import { useRole } from '@/components/RoleProvider';
import { Heart, Home, Layers, Shirt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Three destinations for him, four for her.
 *
 * His used to have five. Modes was never a place — it is an input to one
 * generation, so it lives in the Today context sheet now. Profile is opened
 * a few times a year, so it is a button in the Today header instead of a
 * permanent quarter of the navigation.
 *
 * Hers keeps four because Style him is a genuinely separate, frequent job
 * rather than a view of the same data.
 */
const OWNER_NAV = [
  { href: '/',         label: 'Today',    Icon: Home,   match: (p: string) => p === '/' },
  { href: '/wardrobe', label: 'Wardrobe', Icon: Shirt,  match: (p: string) => p.startsWith('/wardrobe') },
  { href: '/looks',    label: 'Looks',    Icon: Layers, match: (p: string) => p.startsWith('/looks') || p.startsWith('/outfits') },
];

const PARTNER_NAV = [
  { href: '/',         label: 'Home',      Icon: Home,   match: (p: string) => p === '/' },
  { href: '/wardrobe', label: 'Wardrobe',  Icon: Shirt,  match: (p: string) => p.startsWith('/wardrobe') },
  { href: '/style',    label: 'Style him', Icon: Heart,  match: (p: string) => p.startsWith('/style') },
  { href: '/looks',    label: 'Picks',     Icon: Layers, match: (p: string) => p.startsWith('/looks') || p.startsWith('/outfits') },
];

export function BottomNav() {
  const pathname = usePathname();
  const role = useRole();
  const NAV = role === 'partner' ? PARTNER_NAV : OWNER_NAV;

  // The lock screen is chrome-free.
  if (pathname.startsWith('/unlock')) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed z-50"
      style={{
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'max-content',
        maxWidth: 'calc(100vw - 12px)',
      }}
    >
      <div
        // Opaque enough to sit over the crimson primary action without the
        // button's colour and label bleeding through the blur.
        className="flex items-center gap-1 rounded-full p-1.5 bg-ink-200/[0.92] border border-white/[0.08]"
        style={{
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {NAV.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                // 48px tall, and every label stays visible. The old bar showed the
                // label only on the active tab and animated its width, so the whole
                // pill shifted under your thumb between taps. Stacking icon over
                // label keeps four of them on a phone without that trick.
                'relative flex h-12 min-w-[64px] flex-col items-center justify-center gap-1 rounded-full px-2',
                'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                active ? 'bg-crimson-400 text-white' : 'text-fog-300 hover:text-fog-100',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden className="shrink-0" />
              <span className="whitespace-nowrap text-[11px] font-semibold leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
