import Link from 'next/link';
import type { ProductLearnerRow } from '@/lib/product-stats';

/**
 * Phase 9.1 Plan 09.1-05 Task 2 — Tab "Apprenants formés" de la fiche produit
 * (Server Component).
 *
 * Liste DISTINCTE des apprenants ayant suivi ce produit ≥ 1 session, chaque
 * row cliquable vers `/app/apprenants/{personId}` (D-05 cross-nav).
 *
 * Empty state (UI-SPEC §Empty states) : "Aucun apprenant formé" + sub.
 *
 * Wrapper `overflow-x-auto -mx-4 sm:mx-0` (pattern Phase 3 RESP-05).
 */

interface Props {
  learners: ProductLearnerRow[];
}

export function ProductLearnersTab({ learners }: Props) {
  if (learners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-100/30 p-8 text-center">
        <h3 className="text-base font-semibold mb-1">Aucun apprenant formé</h3>
        <p className="text-sm text-slate-500">
          Les apprenants apparaîtront ici après leur première session.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200">
          <tr className="text-left">
            <th scope="col" className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">
              Apprenant
            </th>
            <th scope="col" className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">
              Email
            </th>
            <th scope="col" className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium text-right">
              Nombre de sessions
            </th>
          </tr>
        </thead>
        <tbody>
          {learners.map((l) => {
            const fullName = `${l.lastName.toUpperCase()} ${l.firstName}`.trim();
            return (
              <tr
                key={l.personId}
                className="border-b border-slate-200 hover:bg-slate-100/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/app/apprenants/${l.personId}` as any}
                    className="font-medium text-primary hover:underline"
                  >
                    {fullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {l.email ?? <span className="italic">—</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {/* L'attribut data-* permet aux tests grep d'attester la présence
                      sémantique de sessionsCount. */}
                  <span data-sessions-count={l.sessionsCount}>
                    {l.sessionsCount} session{l.sessionsCount > 1 ? 's' : ''}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
