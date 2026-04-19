'use client';

import { cn } from '@/lib/cn';
import { Home, Shirt, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',         label: 'Today',    icon: Home,     match: (p: string) => p === '/' },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt,    match: (p: string) => p.startsWith('/wardrobe') },
  { href: '/modes',    label: 'Modes',    icon: Sparkles, match: (p: string) => p.startsWith('/modes') || p.startsWith('/outfits') },
  { href: '/profile',  label: 'Profile',  icon: User,     match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', paddingLeft: '0', paddingRight: '0' }}
      aria-label="Primary"
    >
      <div className="mx-auto max-w-xl px-5 pointer-events-auto">
        <div
          className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] rounded-full px-2 py-2 flex justify-between items-center shadow-nav-pill"
        >
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'press relative flex flex-col items-center justify-center gap-1 rounded-full transition-all duration-200',
                  'flex-1 h-14',
                  active ? 'text-[#FFEDE8]' : 'text-white/40 hover:text-white/70'
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(226,51,93,0.25) 0%, rgba(187,22,95,0.25) 100%)',
                      boxShadow: '0 0 20px rgba(226,51,93,0.3)',
                      border: '1px solid rgba(226,51,93,0.25)',
                    }}
                  />
                )}
                <Icon size={20} className="relative" strokeWidth={active ? 2.4 : 1.8} />
                <span className="relative text-oneui-tab">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
