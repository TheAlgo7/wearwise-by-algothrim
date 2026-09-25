'use client';

import { cn } from '@/lib/cn';
import { useRole } from '@/components/RoleProvider';
import { useLiquidGlass } from '@/hooks/useLiquidGlass';
import { Droplets, Heart, Home, Layers, Shirt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

/**
 * Four destinations each, for different reasons.
 *
 * His used to have five, of which Modes was never a place (it is an input to
 * one generation, so it lives in the Today context sheet) and Profile is opened
 * a few times a year (so it is a button in the Today header). That left three.
 * Care earns the fourth slot because it is not a setting: it is a second daily
 * decision system with its own state, sitting alongside the wardrobe.
 *
 * Hers keeps four because Style him is a genuinely separate, frequent job
 * rather than a view of the same data. Care is not hers to see at all.
 */
const OWNER_NAV = [
  { href: '/',         label: 'Today',    Icon: Home,     match: (p: string) => p === '/' },
  { href: '/wardrobe', label: 'Wardrobe', Icon: Shirt,    match: (p: string) => p.startsWith('/wardrobe') },
  // Droplets, not sparkles: sparkles is the universal "AI" mark, and Care is the
  // one part of the app that deliberately does not call a model.
  { href: '/care',     label: 'Care',     Icon: Droplets, match: (p: string) => p.startsWith('/care') },
  { href: '/looks',    label: 'Looks',    Icon: Layers,   match: (p: string) => p.startsWith('/looks') || p.startsWith('/outfits') },
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
  const glassRef = useRef<HTMLDivElement>(null);
  const hidden = pathname.startsWith('/unlock');
  useLiquidGlass(glassRef, 'ww-nav-glass', !hidden);

  // The lock screen is chrome-free.
  if (hidden) return null;

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
        ref={glassRef}
        // `.nav-glass` is frosted everywhere; on Chromium useLiquidGlass swaps
        // in real edge refraction and a thinner tint (see globals.css).
        className="nav-glass flex items-center gap-1 rounded-full p-1.5"
      >
        {NAV.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={cn(
                // Icon always, label only on the active tab, which expands into
                // it. This is WearWise's nav, shared with Go and Vandana, and
                // stacking icon-over-label to fit four tabs made it look like
                // every other app. 48px targets, the distinctive shape kept.
                'relative flex h-12 items-center justify-center rounded-full px-3.5 min-w-[48px]',
                'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                active ? 'text-white' : 'text-fog-300 hover:text-fog-100',
              )}
              style={active ? { background: 'rgb(var(--accent-400))' } : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} aria-hidden className="flex-shrink-0" />
              <span
                className="overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none"
                style={{
                  maxWidth: active ? '80px' : '0px',
                  marginLeft: active ? '7px' : '0px',
                  opacity: active ? 1 : 0,
                  transition:
                    'max-width 240ms cubic-bezier(0.22,1,0.36,1) 40ms, margin-left 240ms cubic-bezier(0.22,1,0.36,1) 40ms, opacity 160ms ease 60ms',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
