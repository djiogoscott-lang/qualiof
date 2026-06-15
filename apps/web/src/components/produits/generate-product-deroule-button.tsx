'use client';

import { useState, useTransition } from 'react';
import { FileText, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateDerouleForProduct } from '@/server/actions/deroule-product-generator';

export function GenerateProductDerouleButton({
  productId,
  programmeReady = false,
  variant = 'primary',
}: {
  productId: string;
  programmeReady?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const [pending, startTransition] = useTransition();
  const [docId, setDocId] = useState<string | null>(null);

  if (!programmeReady) {
    return (
      <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-sm font-medium bg-slate-100 text-slate-500 cursor-not-allowed opacity-60" title="Générez d'abord le Programme PDF">
        <FileText className="h-4 w-4" />
        Générer après le programme
      </div>
    );
  }

  function run(force: boolean) {
    startTransition(async () => {
      try {
        const r = await generateDerouleForProduct(productId, { force });
        if (r?.ok && r.documentId) {
          setDocId(r.documentId);
          if (r.usedStub) {
            toast.warning('Déroulé généré en mode stub (Ollama indisponible) — relance plus tard');
          } else {
            toast.success(force ? 'Déroulé régénéré' : 'Déroulé pédagogique disponible');
          }
          window.open(`/api/documents/${r.documentId}`, '_blank');
        } else {
          toast.error(r?.error ?? 'Erreur génération déroulé');
        }
      } catch (e: any) {
        toast.error(`Erreur : ${e?.message ?? String(e)}`);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => run(false)}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-sm font-medium transition-colors',
          variant === 'primary'
            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm hover:from-indigo-700 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)] active:scale-[0.97] transition-all duration-200'
            : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100/40',
          pending && 'opacity-70 cursor-wait',
        )}
        title="Voir le déroulé pédagogique du produit (génère si absent)"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Voir le déroulé péda.
      </button>
      <button
        type="button"
        onClick={() => run(true)}
        disabled={pending}
        title="Régénérer (force une nouvelle génération IA)"
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 bg-white hover:bg-slate-100/40 text-slate-500 hover:text-slate-900"
      >
        <RefreshCw className="h-3.5 w-3.5" />
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
