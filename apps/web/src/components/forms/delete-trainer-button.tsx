'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteTrainer } from '@/server/actions/crud-edits';

export function DeleteTrainerButton({
  personId,
  fullName,
}: {
  personId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(`Supprimer le formateur ${fullName} ?\n\nCette action est irréversible. Si le formateur a des sessions affectées, la suppression sera bloquée.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await deleteTrainer(personId);
      if (r.ok) {
        toast.success(`Formateur ${fullName} supprimé`);
        router.push('/app/formateurs');
      } else {
        toast.error(r.error ?? 'Erreur lors de la suppression');
        setBusy(false);
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message ?? e}`);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xl border border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {busy ? 'Suppression…' : 'Supprimer'}
    </button>
  );
}
