import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Chip {
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

/**
 * FilterChips — Sortilège d'Halloween (dark mode).
 *
 *  - Inactif : glass-panel léger + texte zinc
 *  - Actif : gradient mystic violet + ring primary + glow
 *  - Hover : bordure ambrée + translate-y
 */
export function FilterChips({ chips }: { chips: Chip[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip) => (
        <Link
          key={chip.href}
          href={chip.href as never}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold transition-all duration-300 ease-out backdrop-blur-md',
            chip.active
              ? 'bg-mystic-gradient text-white border border-primary/40 shadow-mystic'
              : 'bg-white/[0.04] text-zinc-300 border border-white/10 hover:border-halloween-glow/40 hover:text-halloween-glow hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-[0_0_18px_-4px_rgba(245,158,11,0.30)]',
          )}
        >
          {chip.label}
          {chip.count !== undefined && (
            <span
              className={cn(
                'tabular-nums text-[10px] font-bold rounded-full px-1.5 py-0.5',
                chip.active ? 'bg-white/20 text-white ring-1 ring-white/15' : 'bg-white/[0.05] text-zinc-400 ring-1 ring-white/10',
              )}
            >
              {chip.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
