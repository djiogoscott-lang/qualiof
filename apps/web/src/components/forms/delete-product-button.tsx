'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProduct } from '@/server/actions/crud-edits';

export function DeleteProductButton({
  productId,
  productCode,
}: {
  productId: string;
  productCode: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(`Supprimer le produit ${productCode} ?\n\nCette action est irréversible. Si des sessions utilisent ce produit, la suppression sera bloquée — désactive-le plutôt depuis Éditer.`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await deleteProduct(productId);
      if (r.ok) {
        toast.success(`Produit ${productCode} supprimé`);
        router.push('/app/produits');
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
