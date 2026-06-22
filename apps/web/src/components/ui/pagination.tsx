import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

export function Pagination({ total, page, pageSize, basePath, searchParams = {} }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages === 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v) params.set(k, v);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ''}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Bouton — glass-panel léger + hover ambré (Halloween).
  const btn = (disabled: boolean) =>
    cn(
      'inline-flex h-9 items-center gap-1 px-3 rounded-xl text-xs font-semibold',
      'bg-white/[0.04] text-zinc-200 border border-white/10 backdrop-blur-md shadow-soft transition-all duration-300 ease-out',
      'hover:border-halloween-glow/40 hover:text-halloween-glow hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-[0_0_18px_-4px_rgba(245,158,11,0.30)]',
      disabled && 'opacity-40 pointer-events-none',
    );

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-zinc-500">
        <span className="font-semibold text-zinc-100 tabular-nums">{start}–{end}</span>
        <span className="text-zinc-700 mx-1.5">·</span>
        sur <span className="font-semibold text-zinc-100 tabular-nums">{total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href={buildHref(Math.max(1, page - 1)) as never}
          aria-disabled={page === 1}
          className={btn(page === 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /> Préc.
        </Link>
        <span className="text-xs text-zinc-400 font-semibold px-2.5 tabular-nums">
          {page} <span className="text-zinc-700">/</span> {totalPages}
        </span>
        <Link
          href={buildHref(Math.min(totalPages, page + 1)) as never}
          aria-disabled={page === totalPages}
          className={btn(page === totalPages)}
        >
          Suiv. <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
