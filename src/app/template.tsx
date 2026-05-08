'use client';

/**
 * template.tsx re-mounts on every route change (unlike layout.tsx which persists).
 * This gives us smooth page transitions — each navigation fades + slides in.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        animation: 'page-enter var(--duration-base) var(--ease-spring) both',
      }}
    >
      {children}
    </div>
  );
}
