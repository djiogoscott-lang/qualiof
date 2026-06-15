'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteSession } from '@/server/actions/sessions';

export function DeleteSessionButton({
  sessionId,
  sessionCode,
}: {
  sessionId: string;
  sessionCode: string;
  participantCount?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    // window.confirm natif — pas de Radix Dialog qui pourrait intercepter.
    const typed = window.prompt(
      `Pour supprimer définitivement la session ${sessionCode}, tape son code ci-dessous :`,
      '',
    );
    if (typed === null) return; // cancel
    if (typed.trim().toUpperCase() !== sessionCode.toUpperCase()) {
      toast.error(`Code incorrect : tu as tapé "${typed}", attendu "${sessionCode}"`);
      return;
    }

    setBusy(true);
    try {
      const r = await deleteSession(sessionId);
      if (r.ok) {
        toast.success(`Session ${sessionCode} supprimée`);
        // Force reload complet vers la liste sessions
        window.location.assign('/app/sessions');
      } else {
        toast.error(r.error ?? 'Erreur lors de la suppression');
        setBusy(false);
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? String(e)}`);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xl border border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? 'Suppression…' : 'Supprimer la session'}
    </button>
  );
}
