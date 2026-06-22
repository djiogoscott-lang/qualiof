import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  palier: string; // ex : "Palier 2.2"
  features: string[];
}

export function Placeholder({ icon: Icon = Sparkles, title, subtitle, palier, features }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
      </div>

      <div className="glass-panel-strong border-dashed border-primary/30 p-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mystic-gradient text-white mb-4 shadow-mystic ring-1 ring-primary/40">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">Bientôt disponible</h2>
        <p className="text-sm text-zinc-400 mt-1.5 max-w-md mx-auto">
          Cette section arrive au <span className="font-medium text-mystic-gradient">{palier}</span>.
        </p>
        {features.length > 0 && (
          <div className="mt-6 max-w-md mx-auto text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Au programme :
            </div>
            <ul className="space-y-1.5 text-sm text-zinc-200">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-halloween-glow shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
