import Link from 'next/link';
import { Megaphone, User, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { prisma } from '@qualiof/db';
import { validateRequest } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { AutoAssignLeadsButton } from '@/components/leads/auto-assign-button';

export const dynamic = 'force-dynamic';

const fmtDate = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const STATUS_VARIANT: Record<
  string,
  'muted' | 'info' | 'warning' | 'success' | 'danger' | 'primary'
> = {
  NEW: 'muted',
  CONTACTED: 'info',
  QUALIFIED: 'info',
  PROPOSAL_SENT: 'warning',
  NEGOTIATION: 'primary',
  WON: 'success',
  LOST: 'danger',
  ON_HOLD: 'muted',
  TO_FOLLOWUP: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUALIFIED: 'Qualifié',
  PROPOSAL_SENT: 'Proposition',
  NEGOTIATION: 'Négo',
  WON: 'Gagné',
  LOST: 'Perdu',
  ON_HOLD: 'En attente',
  TO_FOLLOWUP: 'À relancer',
};

export default async function LeadsPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const [leads, commercials, statusCounts] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId: user.tenantId },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        person: { select: { firstName: true, lastName: true } },
        interestedProduct: { select: { title: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: 'COMMERCIAL' },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId: user.tenantId },
      _count: { _all: true },
    }),
  ]);

  const counter = (status: string) =>
    statusCounts.find((c) => c.status === status)?._count._all ?? 0;

  const unassignedCount = leads.filter(
    (l) => !l.ownerUserId && l.status !== 'WON' && l.status !== 'LOST',
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Pipeline commercial · auto-assignation aux commerciaux disponibles."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={'/app/leads/new' as any}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Nouveau lead
            </Link>
            <AutoAssignLeadsButton unassignedCount={unassignedCount} />
          </div>
        }
      />

      {commercials.length === 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 inline-flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Aucun utilisateur n'a le rôle <strong className="text-amber-100">COMMERCIAL</strong>. L'auto-assignation
          ne pourra pas fonctionner — modifie les rôles dans les paramètres.
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Nouveaux" value={counter('NEW')} variant="muted" />
        <Kpi
          label="En cours"
          value={
            counter('CONTACTED') +
            counter('QUALIFIED') +
            counter('PROPOSAL_SENT') +
            counter('NEGOTIATION')
          }
          variant="info"
        />
        <Kpi label="Gagnés" value={counter('WON')} variant="success" />
        <Kpi
          label="Non assignés"
          value={unassignedCount}
          variant={unassignedCount > 0 ? 'warning' : 'muted'}
        />
      </section>

      <section className="rounded-xl bg-slate-800 text-slate-100 border border-slate-700 shadow-md overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Megaphone className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-semibold text-slate-200">Aucun lead pour l'instant</h3>
            <p className="text-sm text-slate-400">
              Les leads apparaîtront ici (formulaire public, salon, recommandation, LinkedIn).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60 text-left">
                  <Th>Statut</Th>
                  <Th>Contact</Th>
                  <Th>Source</Th>
                  <Th>Intérêt</Th>
                  <Th>Commercial</Th>
                  <Th>Créé le</Th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const contactName = l.person
                    ? `${l.person.firstName} ${l.person.lastName}`.trim()
                    : `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—';
                  return (
                    <tr
                      key={l.id}
                      className="border-b border-slate-700 last:border-0 hover:bg-slate-700/40"
                    >
                      <Td>
                        <Badge variant={STATUS_VARIANT[l.status] ?? 'muted'}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="font-medium text-slate-200">{contactName}</div>
                        {l.email && (
                          <div className="text-xs text-slate-400">{l.email}</div>
                        )}
                      </Td>
                      <Td className="text-slate-200">{l.source ?? <span className="text-slate-400">—</span>}</Td>
                      <Td className="text-slate-200">
                        {l.interestedProduct?.title ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        {l.owner ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            {l.owner.firstName} {l.owner.lastName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-300">
                            <User className="h-3.5 w-3.5" />
                            Non assigné
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs text-slate-400">
                        {fmtDate.format(l.createdAt)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-semibold text-slate-400">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ''}`}>{children}</td>;
}

function Kpi({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'muted' | 'info' | 'success' | 'warning';
}) {
  // Charte ardoise solide : conteneur slate-800 + accent color sur le ring/icone uniquement.
  const cls: Record<string, string> = {
    muted: 'bg-slate-800 text-slate-100 border border-slate-700',
    info: 'bg-slate-800 text-slate-100 border border-sky-500/40 ring-1 ring-sky-500/20',
    success: 'bg-slate-800 text-slate-100 border border-emerald-500/40 ring-1 ring-emerald-500/20',
    warning: 'bg-slate-800 text-slate-100 border border-amber-500/40 ring-1 ring-amber-500/20',
  };
  return (
    <div className={`rounded-xl shadow-md p-4 ${cls[variant]}`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums text-slate-100">{value}</div>
    </div>
  );
}
