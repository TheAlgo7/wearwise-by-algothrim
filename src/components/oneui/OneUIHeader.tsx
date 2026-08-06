import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

/**
 * Page header. Title, one supporting line, one optional action.
 *
 * There is no eyebrow. An uppercase crimson label restating the page you are
 * already on cost a line of vertical space, spent the accent colour on
 * decoration, and read as filler. The title carries it.
 */
export function OneUIHeader({ title, subtitle, right, className }: OneUIHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4 px-5 pt-14 pb-5', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight text-fog-100 text-balance">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-oneui-body text-fog-300 text-pretty">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0 self-start">{right}</div> : null}
    </header>
  );
}
