'use client';

import { useState, useTransition } from 'react';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateProgrammeForProduct } from '@/server/actions/programme-generator';

export function GenerateProductProgrammeButton({ productId }: { productId: string }) {
  const [pending, startTransition] = useTransition();
  const [docId, setDocId] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const r = await generateProgrammeForProduct(productId);
        if (r?.ok && r.documentId) {
          setDocId(r.documentId);
          window.open(`/api/documents/${r.documentId}`, '_blank');
        } else {
          toast.error(r?.error ?? 'Erreur génération programme (réponse vide du serveur)');
        }
      } catch (e: any) {
        toast.error(`Erreur : ${e?.message ?? String(e)}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium shadow-sm hover:from-indigo-700 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)] active:scale-[0.97] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)] transition-all duration-300 ease-out active:scale-[0.97]',
          pending && 'opacity-70 cursor-wait',
        )}
        title="Génère le programme PDF prêt pour Qualiopi à partir des champs ci-dessous"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Voir le programme PDF
      </button>
      {docId && (
        <a
          href={`/api/documents/${docId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" /> Réouvrir
        </a>
      )}
    </div>
  );
}
