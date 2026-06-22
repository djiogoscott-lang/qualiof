'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * État d'erreur partagé pour tous les error.tsx — style SaaS Premium.
 *
 * Affiche une icône cercle pastel rouge, un titre, le message d'erreur
 * (et l'optionnel `digest` Next.js pour le support), puis 2 actions :
 *  - Réessayer (`reset()` Next.js → re-render la route)
 *  - Retour (lien configurable, par défaut `/app`)
 *
 * Logge l'erreur côté client via `console.error` au mount pour Sentry-like.
 */

interface ErrorStateProps {
  title?: string;
  message?: string;
  digest?: string;
  onReset?: () => void;
  /** URL du lien de retour. Default `/app`. */
  homeHref?: string;
  /** Libellé du lien de retour. Default "Tableau de bord". */
  homeLabel?: string;
}

export function ErrorState({
  title = 'Une erreur s\'est produite',
  message,
  digest,
  onReset,
  homeHref = '/app',
  homeLabel = 'Tableau de bord',
}: ErrorStateProps) {
  return (
    <div className="max-w-md mx-auto mt-12 glass-panel-strong p-8">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex h-14 w-14 mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 via-red-500/15 to-red-700/20 text-red-300 items-center justify-center ring-1 ring-red-400/40 shadow-[0_0_24px_-4px_rgba(239,68,68,0.45)]">
          <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
        </div>

        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="text-sm text-zinc-400 mt-1.5 max-w-sm leading-relaxed">
          {message || "Recharge la page ou retourne à l'accueil. Si le problème persiste, contacte le support."}
        </p>

        {digest && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-[11px] font-mono text-zinc-400">
            <span className="uppercase tracking-wider font-semibold text-zinc-500">ID</span> {digest}
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 flex-wrap justify-center">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn-mystic"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Réessayer
            </button>
          )}
          <Link
            href={homeHref as Route}
            className="btn-ghost-mystic"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={1.75} /> {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
