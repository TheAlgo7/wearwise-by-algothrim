'use client';

import { cn } from '@/lib/cn';
import { Home, Shirt, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',         label: 'Today',    Icon: Home,     match: (p: string) => p === '/' },
  { href: '/wardrobe', label: 'Wardrobe', Icon: Shirt,    match: (p: string) => p.startsWith('/wardrobe') },
  { href: '/modes',    label: 'Modes',    Icon: Sparkles, match: (p: string) => p.startsWith('/modes') || p.startsWith('/outfits') },
  { href: '/profile',  label: 'Profile',  Icon: User,     match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav() {
  const pathname = usePathname();

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
        className="flex items-center gap-1 rounded-full px-2 py-2 bg-ink-200/70 border border-white/[0.08]"
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
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center justify-center h-11 rounded-full px-3.5 min-w-[48px]',
                'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-400',
                active ? 'text-crimson-50' : 'text-white/40 hover:text-white/70',
              )}
              style={active ? {
                background: 'rgba(226,51,93,0.22)',
              } : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.1 : 1.7} aria-hidden className="flex-shrink-0" />
              <span
                className="overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none"
                style={{
                  maxWidth: active ? '64px' : '0px',
                  marginLeft: active ? '7px' : '0px',
                  opacity: active ? 1 : 0,
                  transition: 'max-width 220ms cubic-bezier(0.22,1,0.36,1) 45ms, margin-left 220ms cubic-bezier(0.22,1,0.36,1) 45ms, opacity 150ms ease 60ms',
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
