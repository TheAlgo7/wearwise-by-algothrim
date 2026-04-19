import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface OneUIHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function OneUIHeader({ title, eyebrow, subtitle, right, className }: OneUIHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-4 px-5 pt-14 pb-5', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="text-oneui-cap text-[#FF86A0] font-semibold tracking-widest uppercase mb-3">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight text-[#FFEDE8] text-balance">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-oneui-body text-[#FFD9DA]/80 text-pretty">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0 pb-1">{right}</div> : null}
    </header>
  );
}
