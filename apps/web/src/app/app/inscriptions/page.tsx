import Link from 'next/link';
import { Inbox, Clock, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { prisma } from '@qualiof/db';
import { validateRequest } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { NewLinkButton } from '@/components/preinscriptions/new-link-button';
import { BulkRemindersButton } from '@/components/preinscriptions/bulk-reminders-button';

export const dynamic = 'force-dynamic';

const fmtDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_LABEL: Record<string, { label: string; variant: 'muted' | 'info' | 'warning' | 'success' | 'danger'; icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }> }> = {
  PENDING_FORM: { label: 'Lien envoyé · attente', variant: 'muted', icon: Clock },
  SUBMITTED: { label: 'Reçu · à analyser', variant: 'info', icon: Inbox },
  EXTRACTING: { label: 'IA en cours…', variant: 'info', icon: Sparkles },
  EXTRACTED: { label: 'À valider', variant: 'warning', icon: AlertCircle },
  VALIDATED: { label: 'Validé', variant: 'success', icon: CheckCircle2 },
  CONVERTED: { label: 'Converti en apprenant', variant: 'success', icon: CheckCircle2 },
  EXPIRED: { label: 'Expiré', variant: 'danger', icon: XCircle },
  REJECTED: { label: 'Rejeté', variant: 'danger', icon: XCircle },
};

export default async function PreinscriptionsPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const [rows, counts] = await Promise.all([
    prisma.preEnrollment.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        token: true,
        status: true,
        firstName: true,
        lastName: true,
        email: true,
        sentAt: true,
        submittedAt: true,
        expiresAt: true,
        createdAt: true,
        validatedAt: true,
        convertedAt: true,
      },
    }),
    prisma.preEnrollment.groupBy({
      by: ['status'],
      where: { tenantId: user.tenantId },
      _count: true,
    }),
  ]);

  const counter = (status: string) =>
    counts.find((c) => c.status === status)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pré-inscriptions"
        subtitle="Génère un lien à envoyer à tes contacts. Ils déposent leurs pièces, l'IA extrait les données, tu valides en 1 clic."
        actions={
          <div className="flex items-center gap-2">
            <BulkRemindersButton pendingCount={counter('PENDING_FORM')} />
            <NewLinkButton />
          </div>
        }
      />

      {/* Bandeau KPI */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiPill icon={Clock} label="Liens envoyés" value={counter('PENDING_FORM')} tone="default" />
        <KpiPill icon={AlertCircle} label="À valider" value={counter('SUBMITTED') + counter('EXTRACTING') + counter('EXTRACTED')} tone="warning" />
        <KpiPill icon={CheckCircle2} label="Convertis" value={counter('CONVERTED')} tone="success" />
        <KpiPill icon={XCircle} label="Expirés / rejetés" value={counter('EXPIRED') + counter('REJECTED')} tone="muted" />
      </section>

      {/* Liste */}
      <section className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Inbox className="h-10 w-10 text-slate-400 mx-auto" />
            <h3 className="font-semibold">Aucune pré-inscription pour l'instant</h3>
            <p className="text-sm text-slate-400">
              Clique sur <strong>Nouveau formulaire</strong> pour générer un lien à partager
              avec un contact.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/40">
                  <Th>Statut</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>Émis le</Th>
                  <Th>Soumis le</Th>
                  <Th>Expire le</Th>
                  <Th>{' '}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = STATUS_LABEL[r.status];
                  const Icon = s?.icon ?? Inbox;
                  const expired = r.status === 'PENDING_FORM' && r.expiresAt < new Date();
                  return (
                    <tr key={r.id} className="border-b border-slate-700 last:border-0 hover:bg-slate-700/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <Badge variant={expired ? 'danger' : (s?.variant ?? 'muted')}>
                          <Icon className="h-3 w-3" /> {expired ? 'Expiré' : (s?.label ?? r.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.firstName || r.lastName ? (
                          <div className="font-medium">{r.firstName} {r.lastName}</div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">— anonyme —</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.email ? (
                          <span className="text-xs">{r.email}</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {fmtDate.format(r.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {r.submittedAt ? fmtDate.format(r.submittedAt) : <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {fmtDate.format(r.expiresAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/app/inscriptions/${r.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Voir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <p className="text-xs text-slate-400 italic">
          💡 Un lien expiré peut être régénéré par sécurité. Une pré-inscription validée crée
          automatiquement un Person + une Organization EI + un AgeficeProfile pré-rempli.
        </p>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
      {children}
    </th>
  );
}

function KpiPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: number;
  tone: 'default' | 'success' | 'warning' | 'muted';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/10/50 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10/50 text-amber-200'
        : tone === 'muted'
          ? 'border-slate-700 bg-slate-900/60/50 text-slate-200'
          : 'border-slate-700 bg-slate-800';
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${toneClass}`}>
      <Icon className="h-5 w-5 shrink-0 opacity-70" />
      <div>
        <div className="text-2xl font-semibold tabular-nums leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wide opacity-80 mt-1">{label}</div>
      </div>
    </div>
  );
}
