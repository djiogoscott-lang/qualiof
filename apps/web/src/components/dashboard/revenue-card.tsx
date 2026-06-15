import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label: string;
  amount: number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'primary';
}

export function RevenueCard({ icon: Icon, label, amount, hint, tone = 'default' }: Props) {
  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const tones = {
    default: 'bg-white border-slate-200',
    primary: 'bg-indigo-50/60 border-indigo-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
  } as const;
  const iconBg = {
    default: 'bg-indigo-50 text-indigo-600',
    primary: 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
  } as const;
  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5', tones[tone])}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </div>
          <div className="text-2xl font-semibold mt-1.5 tabular-nums">
            {fmt.format(amount)} <span className="text-base font-normal text-slate-500">€ HT</span>
          </div>
        </div>
        <div className={cn('h-9 w-9 rounded-lg inline-flex items-center justify-center shrink-0', iconBg[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      {hint && <div className="text-xs text-slate-500 mt-3">{hint}</div>}
    </div>
  );
}
