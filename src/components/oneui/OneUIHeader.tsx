import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

/**
 * One UI "large title" header. Large typography at top-left ("viewing area"),
 * optional eyebrow/caption above, and room for action on the right.
 */
export function OneUIHeader({ title, eyebrow, subtitle, right, className }: OneUIHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4 px-4 pt-6 pb-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <div className="oneui-hero-sub mb-2">{eyebrow}</div> : null}
        <h1 className="oneui-hero text-balance">{title}</h1>
        {subtitle ? <p className="mt-2 text-oneui-body text-fog-300 text-pretty">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0 pb-1">{right}</div> : null}
    </header>
  );
}
