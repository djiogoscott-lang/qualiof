import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Badge — Sortilège d'Halloween (dark mode).
 * Pastilles statut sur fond glass + ring color-coded.
 */

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';

const variants: Record<Variant, string> = {
  default: 'bg-white/[0.06] text-zinc-200 ring-1 ring-white/10',
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
  warning: 'bg-halloween-glow/15 text-amber-200 ring-1 ring-halloween-glow/35',
  danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30',
  info: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
  muted: 'bg-white/[0.04] text-zinc-400 ring-1 ring-white/10',
  primary: 'bg-primary/15 text-primary-200 ring-1 ring-primary/30',
};

export function Badge({
  children,
  variant = 'default',
  className,
  title,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none whitespace-nowrap',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
