'use client';

/**
 * template.tsx re-mounts on every route change (unlike layout.tsx which
 * persists). This gives us smooth page transitions: each navigation fades and
 * slides in.
 *
 * `fill-mode` is `backwards`, not `both`, on purpose. With `both`, the finished
 * animation keeps contributing a (now identity) transform, and an element with
 * a transform is a containing block for `position: fixed` descendants. Every
 * fixed element inside a page was therefore anchored to the bottom of the whole
 * scrollable document instead of the viewport: the wardrobe's add button landed
 * ~2400px down the page, and Ishita's outfit tray floated somewhere below the
 * shelves rather than above the nav. `backwards` still covers the pre-start
 * frame, then stops contributing once the animation ends, which leaves the
 * element in its natural untransformed state.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        animation: 'page-enter var(--duration-base) var(--ease-spring) backwards',
      }}
    >
      {children}
    </div>
  );
}
