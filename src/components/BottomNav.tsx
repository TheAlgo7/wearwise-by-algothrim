'use client';

import { cn } from '@/lib/cn';
import { Home, Shirt, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',          label: 'Today',    icon: Home,     match: (p: string) => p === '/' },
  { href: '/wardrobe',  label: 'Wardrobe', icon: Shirt,    match: (p: string) => p.startsWith('/wardrobe') },
  { href: '/modes',     label: 'Modes',    icon: Sparkles, match: (p: string) => p.startsWith('/modes') || p.startsWith('/outfits') },
  { href: '/profile',   label: 'Profile',  icon: User,     match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      aria-label="Primary"
    >
      <div className="mx-auto max-w-xl px-3 pb-2 pointer-events-auto">
        <div className="bg-ink-200/80 backdrop-blur-xl border border-white/[0.06] rounded-squircle-lg shadow-oneui-raised px-2 py-2 grid grid-cols-4 gap-1">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'press relative flex flex-col items-center justify-center gap-1 h-14 rounded-squircle-sm transition-colors',
                  active
                    ? 'text-white'
                    : 'text-fog-300 hover:text-fog-100'
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-squircle-sm bg-crimson-gradient shadow-crimson-glow"
                  />
                )}
                <Icon size={20} className="relative" strokeWidth={active ? 2.4 : 2} />
                <span className="relative text-oneui-tab">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
