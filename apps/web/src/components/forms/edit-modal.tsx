'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

export interface EditField {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'textarea' | 'select';
  defaultValue?: string | number | null;
  options?: { value: string; label: string }[]; // pour type=select
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

interface EditModalProps {
  buttonLabel?: string;
  title: string;
  fields: EditField[];
  onSubmit: (values: Record<string, string | number | null>) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}

export function EditModal({
  buttonLabel = 'Éditer',
  title,
  fields,
  onSubmit,
  onSuccess,
}: EditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce((acc, f) => ({ ...acc, [f.name]: f.defaultValue?.toString() ?? '' }), {}),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Convert values per field type
    const cleaned: Record<string, string | number | null> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (v === '' || v == null) {
        cleaned[f.name] = null;
        continue;
      }
      if (f.type === 'number') {
        const n = parseFloat(v.replace(',', '.'));
        if (Number.isNaN(n)) {
          setError(`${f.label} doit être un nombre.`);
          setBusy(false);
          return;
        }
        cleaned[f.name] = n;
      } else {
        cleaned[f.name] = v;
      }
    }

    try {
      const r = await onSubmit(cleaned);
      if (r.ok) {
        toast.success('Modifications enregistrées');
        setOpen(false);
        onSuccess?.();
        // P3.2 — router.refresh() au lieu de window.location.reload() :
        // revalide le Server Component courant en gardant l'état client
        // (modales fermées, scroll, focus), sans full reload.
        router.refresh();
      } else {
        setError(r.error ?? 'Erreur inconnue.');
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-md hover:text-slate-900 hover:-translate-y-0.5 transition-all duration-200"
      >
        <Pencil className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-slate-900 mb-5 tracking-tight">{title}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    {f.label}
                    {f.required && <span className="text-red-600 ml-0.5">*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      rows={f.rows ?? 3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">— Aucun —</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'text' : 'text'}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      required={f.required}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  )}
                </div>
              ))}
              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 shadow-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="h-10 px-4 text-sm font-medium border border-slate-200 bg-white text-slate-700 rounded-xl shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-10 px-5 text-sm font-medium bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl shadow-sm transition-all duration-200 hover:from-indigo-700 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)] active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                >
                  {busy ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
