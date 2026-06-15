'use client';

/**
 * Bouton "Émettre facture" + modale (US-011).
 * Ouvre une modale pré-remplie : numéro auto FAC-NNNNNN, date du jour,
 * échéance 30 jours, notes optionnelles. Au submit appelle
 * createInvoiceFromParticipant qui crée Invoice + PDF + bascule
 * invoiceSent=true sur la timeline.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Loader2, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createInvoiceFromParticipant } from '@/server/actions/invoices';

interface Props {
  participantId: string;
  /** Affiché en sous-titre dans la modale */
  apprenantName: string;
  formationTitre: string;
  amountHT: number;
}

const fmtEUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

export function EmitInvoiceButton({
  participantId,
  apprenantName,
  formationTitre,
  amountHT,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dueDateDays, setDueDateDays] = useState(30);
  const [notes, setNotes] = useState('');

  function submit() {
    startTransition(async () => {
      const r = await createInvoiceFromParticipant({
        participantId,
        dueDateDays,
        notes: notes.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.error ?? 'Erreur émission facture');
        return;
      }
      toast.success(`Facture ${r.number} émise`);
      setOpen(false);
      setNotes('');
      // Ouvre le PDF dans un nouvel onglet
      if (r.documentId) {
        window.open(`/api/documents/${r.documentId}`, '_blank');
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Émettre la facture pour ce dossier"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
      >
        <Receipt className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => !pending && setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg inline-flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Émettre une facture
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Le numéro <strong>FAC-NNNNNN</strong> sera attribué automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg bg-slate-100/40 px-3 py-2.5 mb-4 text-sm space-y-0.5">
              <div>
                <span className="text-slate-500">Stagiaire :</span>{' '}
                <strong>{apprenantName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Formation :</span> {formationTitre}
              </div>
              <div>
                <span className="text-slate-500">Montant HT :</span>{' '}
                <strong className="tabular-nums">{fmtEUR.format(amountHT)}</strong>
                <span className="text-xs text-slate-500 ml-2">
                  (TVA non applicable — art. 261-4-4° CGI)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Échéance (jours)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={dueDateDays}
                  onChange={(e) => setDueDateDays(Number(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Note (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Référence dossier OPCO XXX, mode de règlement spécifique…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium shadow-sm hover:from-indigo-700 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)] active:scale-[0.97] transition-all duration-200 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Émettre & ouvrir PDF
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
