'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { deletePerson, deleteTrainingSession } from '@/server/actions/crud-edits';

/**
 * Bouton de suppression avec confirmation modale.
 * - Person : soft delete (archived=true) si historique, hard delete sinon.
 *   Option "force" pour hard delete malgré historique (admin confirme).
 * - TrainingSession : refuse si participants/documents existent.
 */
export function DeleteEntityButton({
  entity,
  entityId,
  entityName,
  redirectTo,
  variant = 'icon',
}: {
  entity: 'person' | 'session';
  entityId: string;
  entityName: string;
  redirectTo?: string;
  variant?: 'icon' | 'button';
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [force, setForce] = useState(false);

  const label = entity === 'person' ? 'apprenant' : 'session';

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const r = entity === 'person'
        ? await deletePerson(entityId, { force })
        : await deleteTrainingSession(entityId);
      if (!r.ok) {
        setError(r.error ?? 'Erreur inconnue.');
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo as any);
      else router.refresh();
    });
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-red-200 bg-white text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]"
          title={`Supprimer ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-red-200 bg-white text-red-700 text-sm font-medium shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]"
        >
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => !pending && setOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 p-2.5 border border-red-100 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">Supprimer {label}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  <strong className="text-slate-900">{entityName}</strong> sera supprimé(e). Cette action est irréversible.
                </p>
              </div>
            </div>

            {entity === 'person' && (
              <label className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 cursor-pointer shadow-sm hover:bg-amber-100/60 transition-colors">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-0.5 accent-amber-600" />
                <span>
                  <strong>Suppression définitive</strong> — supprime aussi les sensibles (RGPD).
                  Sans cette case, l'apprenant est juste archivé s'il a un historique.
                </span>
              </label>
            )}

            {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4 shadow-sm">{error}</div>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-10 px-4 text-sm font-medium border border-slate-200 bg-white text-slate-700 rounded-xl shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 active:scale-[0.97] disabled:opacity-50">Annuler</button>
              <button type="button" onClick={handleDelete} disabled={pending} className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-sm hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.45),0_0_20px_rgba(239,68,68,0.25)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0">
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
