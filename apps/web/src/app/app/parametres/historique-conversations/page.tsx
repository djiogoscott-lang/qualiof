import Link from 'next/link';
import type { Route } from 'next';
import { Mail } from 'lucide-react';
import { prisma } from '@qualiof/db';
import { requireRole } from '@/lib/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';

/**
 * Historique des conversations email (Mission 2026-06-22).
 *
 * Server Component ADMIN-only qui affiche les 50 derniers EmailMessage du
 * tenant : envois sortants (relances factures, invitations préinscription,
 * notifications lead, etc.). Persistance branchée dans `enqueueMail()`.
 *
 * Sécurité : `requireRole(['ADMIN'])` + scope `tenantId` strict.
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  status?: string;
  page?: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'muted'> = {
  sent: 'success',
  queued: 'info',
  'dry-run': 'warning',
  bounced: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  sent: 'Envoyé',
  queued: 'En file',
  'dry-run': 'Mode test (SMTP off)',
  bounced: 'Échec',
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatRecipients(toEmails: unknown): string {
  if (Array.isArray(toEmails)) {
    return toEmails.filter((e): e is string => typeof e === 'string').join(', ');
  }
  if (typeof toEmails === 'string') return toEmails;
  return '—';
}

export default async function HistoriqueConversationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireRole(['ADMIN']);
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const where = {
    tenantId: admin.tenantId,
    ...(sp.status ? { status: sp.status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    }),
    prisma.emailMessage.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusOptions = ['sent', 'queued', 'dry-run', 'bounced'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            Historique des conversations
          </span>
        }
        subtitle="Tous les emails envoyés par QualiOF — relances factures, invitations apprenants, notifications commerciales."
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href={'/app/parametres/historique-conversations' as Route}
          className={`rounded-md border border-slate-200 px-3 py-1 text-sm transition ${
            !sp.status ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Tous ({total})
        </Link>
        {statusOptions.map((s) => (
          <Link
            key={s}
            href={`/app/parametres/historique-conversations?status=${s}` as Route}
            className={`rounded-md border border-slate-200 px-3 py-1 text-sm transition ${
              sp.status === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {STATUS_LABEL[s] ?? s}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="px-4 py-3 font-medium">Sujet</th>
              <th className="px-4 py-3 font-medium">Lié à</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Aucun email enregistré pour l&apos;instant. Les envois apparaîtront ici dès qu&apos;une action déclenchera un mail.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {dateFmt.format(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatRecipients(m.toEmails)}</td>
                  <td className="px-4 py-3 text-slate-900">{m.subject}</td>
                  <td className="px-4 py-3 text-slate-500">{m.relatedEntity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[m.status] ?? 'muted'}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page + 1} / {totalPages} ({total} messages)
          </span>
          <div className="flex gap-2">
            {page > 0 ? (
              <Link
                href={`/app/parametres/historique-conversations?${new URLSearchParams({
                  ...(sp.status ? { status: sp.status } : {}),
                  page: String(page - 1),
                }).toString()}` as Route}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
              >
                ← Précédent
              </Link>
            ) : null}
            {page + 1 < totalPages ? (
              <Link
                href={`/app/parametres/historique-conversations?${new URLSearchParams({
                  ...(sp.status ? { status: sp.status } : {}),
                  page: String(page + 1),
                }).toString()}` as Route}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
              >
                Suivant →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
