import Link from 'next/link';
import {
  Users, Calendar, BookOpen, AlertCircle, AlertTriangle, Building2,
  Euro, TrendingUp, Banknote, Clock, Sparkles, FileCheck, Inbox,
  Megaphone, Target, Activity, BarChart3, Trophy, Wallet, ChevronRight,
  PieChart,
} from 'lucide-react';
import { validateRequest } from '@/lib/auth';
import { getDashboardStats } from '@/lib/dashboard-stats';
import { getAgeficeBudgetSummary } from '@/server/actions/budget-agefice';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { MonthlyChart } from '@/components/dashboard/monthly-chart';
import { SatisfactionOverviewPanel } from '@/components/dashboard/satisfaction-overview-panel';

export const dynamic = 'force-dynamic';

const fmtEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtNb = new Intl.NumberFormat('fr-FR');
const pct = (n: number) => `${n.toFixed(0)}%`;

interface SP {
  year?: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { user } = await validateRequest();
  if (!user) return null;
  const sp = await searchParams;
  const yearParam = sp.year ? parseInt(sp.year, 10) : null;
  const year = Number.isFinite(yearParam) ? yearParam : null;

  const stats = await getDashboardStats(user.tenantId, year);
  const yearLabel = year != null ? String(year) : 'Toutes années';

  // Budget AGEFICE : on cible toujours l'année calendaire en cours pour
  // l'encart pipeline (le plafond 3000€ est annuel par apprenant).
  const ageficeYear = year ?? new Date().getFullYear();
  const ageficeSummary = await getAgeficeBudgetSummary(ageficeYear);

  // Filtre années
  const yearChips = [
    { label: 'Toutes années', href: '/app', active: year === null },
    ...stats.filters.availableYears.map((y) => ({
      label: String(y),
      href: `/app?year=${y}`,
      active: year === y,
    })),
  ];

  // Alertes total
  const totalAlerts =
    stats.alerts.pastWithoutInvoice +
    stats.alerts.sessionsToClose +
    stats.alerts.opcoMissingApproval +
    stats.counts.cleanupPersons +
    stats.counts.cleanupOrgs;

  return (
    <div className="space-y-6 relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-8 h-80 w-[42rem] rounded-full bg-primary/20 blur-3xl -z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 h-72 w-[36rem] rounded-full bg-halloween-glow/15 blur-3xl -z-10"
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Bonsoir <span className="text-mystic-gradient">{user.firstName}</span> 🎃
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5">
            Pilotage Start Academy
            <span className="text-zinc-700 mx-1.5">·</span>
            <span className="font-semibold text-zinc-200">{yearLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/sessions/nouvelle" className="btn-mystic">
            <Calendar className="h-4 w-4" strokeWidth={1.75} /> Nouvelle session
          </Link>
          <Link href="/app/inscriptions" className="btn-ghost-mystic">
            <Inbox className="h-4 w-4" strokeWidth={1.75} /> Pré-inscription
          </Link>
        </div>
      </div>

      <div className="inline-flex items-center gap-0.5 border-b border-white/10">
        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-zinc-100 border-b-2 border-halloween-glow -mb-px">
          <BarChart3 className="h-4 w-4 text-halloween-glow" strokeWidth={2} /> Pilotage
        </span>
        <Link
          href={`/app/qualiopi-bilan${year ? `?year=${year}` : ''}` as any}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-halloween-glow transition-colors"
        >
          <PieChart className="h-4 w-4" strokeWidth={1.75} /> Bilan Qualiopi
        </Link>
      </div>

      {/* Filtre année */}
      <FilterChips chips={yearChips} />

      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            À l'essentiel
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PrioCard
            icon={Euro}
            label="CA encaissé"
            value={fmtEUR.format(stats.ca.collected)}
            sub={`${pct((stats.ca.collected / Math.max(1, stats.ca.invoiced)) * 100)} du facturé`}
            accent="success"
            href="/app/factures?status=PAID"
          />
          <PrioCard
            icon={Wallet}
            label={`AGEFICE ${ageficeYear}`}
            value={fmtEUR.format(ageficeSummary.totalRemaining)}
            sub={`${ageficeSummary.withBudgetLeft} apprenant${ageficeSummary.withBudgetLeft > 1 ? 's' : ''} mobilisable${ageficeSummary.withBudgetLeft > 1 ? 's' : ''}`}
            accent="primary"
            href={`/app/budget-agefice?filter=has_budget_left&year=${ageficeYear}`}
          />
          <PrioCard
            icon={Calendar}
            label="Sessions à venir"
            value={fmtNb.format(stats.pipeline.upcomingSessions)}
            sub={`${fmtEUR.format(stats.pipeline.upcomingForecast)} CA prévu`}
            accent="default"
            href="/app/sessions?filter=upcoming"
          />
          <PrioCard
            icon={Target}
            label="Taux remplissage"
            value={pct(stats.performance.avgFillRate)}
            sub={`sur ${fmtNb.format(stats.performance.nbSessions)} session${stats.performance.nbSessions > 1 ? 's' : ''}`}
            accent={stats.performance.avgFillRate < 50 ? 'warning' : 'default'}
          />
        </div>
      </section>

      {/* Indicateurs détaillés — UX-11 : repliable, fermé par défaut */}
      <CollapsibleSection
        id="dashboard-detailed"
        title="Indicateurs détaillés"
        subtitle="CA, cashflow, volumes & moyennes"
        icon={<BarChart3 className="h-4 w-4 text-zinc-500" aria-hidden="true" />}
      >
        {/* Bandeau CA */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Chiffre d'affaires {yearLabel.toLowerCase()}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <CaCard icon={TrendingUp} label="CA prévu" value={stats.ca.total} accent="primary" href={`/app/inscriptions${year ? `?year=${year}` : ''}`} />
            <CaCard icon={FileCheck} label="CA signé" value={stats.ca.signed} hint="validé/en cours/clos" href={`/app/sessions?filter=signed`} />
            <CaCard icon={Clock} label="CA à venir" value={stats.ca.upcoming} hint={`${stats.counts.upcomingSessions} sessions`} href="/app/sessions?filter=upcoming" />
            <CaCard icon={Banknote} label="Facturé" value={stats.ca.invoiced} href="/app/factures" />
            <CaCard icon={Euro} label="Encaissé" value={stats.ca.collected} accent="success" href="/app/factures?status=PAID" />
            <CaCard icon={AlertCircle} label="Reste à encaisser" value={stats.ca.remaining} accent={stats.ca.remaining > 0 ? 'warning' : 'default'} href="/app/factures?onlyUnpaid=1" />
          </div>
        </div>

        {/* Cashflow : DSO + factures en attente */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Cashflow
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
            <PerfCard
              icon={Clock}
              label={`DSO ${stats.cashflow.nbInvoicesPaid > 0 ? `(${stats.cashflow.nbInvoicesPaid} payées)` : ''}`}
              value={stats.cashflow.dso !== null ? `${stats.cashflow.dso} j` : '—'}
            />
            <PerfCard
              icon={AlertCircle}
              label="Factures en attente"
              value={fmtNb.format(stats.cashflow.nbInvoicesPending)}
            />
          </div>
        </div>

        {/* Performance */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Performance — moyennes & volumes
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <PerfCard icon={Calendar} label="Sessions" value={fmtNb.format(stats.performance.nbSessions)} />
            <PerfCard icon={Users} label="Apprenants" value={fmtNb.format(stats.performance.nbParticipants)} />
            <PerfCard icon={Activity} label="Heures formées" value={fmtNb.format(stats.performance.totalHours)} />
            <PerfCard icon={Target} label="Taux remplissage" value={pct(stats.performance.avgFillRate)} />
            <PerfCard icon={Euro} label="CA / session" value={fmtEUR.format(stats.performance.avgRevenuePerSession)} />
            <PerfCard icon={Euro} label="CA / apprenant" value={fmtEUR.format(stats.performance.avgRevenuePerLearner)} />
            <PerfCard icon={Clock} label="CA / heure" value={fmtEUR.format(stats.performance.revenuePerHour)} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Alertes + Pipeline */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel-strong glass-hover p-6">
          <h2 className="text-base font-bold inline-flex items-center gap-2.5 mb-4 text-zinc-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ember-gradient text-white shadow-ember ring-1 ring-halloween-glow/40">
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            Sessions à risque
            {totalAlerts > 0 && <Badge variant="warning">{totalAlerts}</Badge>}
          </h2>
          {totalAlerts === 0 ? (
            <p className="text-sm text-zinc-400">Aucune alerte. Tout est sous contrôle.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              <AlertRow label="Sessions passées non facturées" count={stats.alerts.pastWithoutInvoice} href="/app/factures" />
              <AlertRow label="Sessions passées non clôturées" count={stats.alerts.sessionsToClose} href="/app/sessions?filter=completed" />
              <AlertRow label="Dossiers OPCO sans validation" count={stats.alerts.opcoMissingApproval} href="/app/dossiers-opco" />
              <AlertRow label="Apprenants à corriger" count={stats.counts.cleanupPersons} href="/app/apprenants?filter=cleanup" />
              <AlertRow label="Organisations à corriger" count={stats.counts.cleanupOrgs} href="/app/organisations?filter=cleanup" />
            </ul>
          )}
        </div>

        <div className="glass-panel-strong glass-hover p-6">
          <h2 className="text-base font-bold inline-flex items-center gap-2.5 mb-4 text-zinc-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mystic-gradient text-white shadow-mystic ring-1 ring-primary/40">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            Pipeline commercial
          </h2>
          <ul className="space-y-1 text-sm">
            <PipelineRow icon={Megaphone} label="Leads à relancer / qualifier" value={stats.pipeline.leadsToFollowup} href="/app/leads" />
            <PipelineRow icon={Inbox} label="Pré-inscriptions à valider" value={stats.pipeline.preEnrollmentsToValidate} href="/app/inscriptions" />
            <PipelineRow icon={Calendar} label={`Sessions à venir (${fmtNb.format(stats.alerts.sessionsNext7Days)} dans 7 jours)`} value={stats.pipeline.upcomingSessions} href="/app/sessions" />
            <PipelineRow
              icon={Wallet}
              label={`Apprenants avec budget AGEFICE restant ${ageficeYear}`}
              value={ageficeSummary.withBudgetLeft}
              href={`/app/budget-agefice?filter=has_budget_left&year=${ageficeYear}`}
            />
            <li className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] font-bold text-zinc-500">CA prévu sessions à venir</span>
              <strong className="text-mystic-gradient tabular-nums text-base">{fmtEUR.format(stats.pipeline.upcomingForecast)}</strong>
            </li>
            <li className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Budget AGEFICE encore mobilisable</span>
              <strong className="text-emerald-300 tabular-nums">{fmtEUR.format(ageficeSummary.totalRemaining)}</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* Top sessions / Top produits / Top sponsors */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TopList
          title="Top 5 sessions rentables"
          icon={Trophy}
          rows={stats.topSessions.map((s) => ({
            href: `/app/sessions/${s.id}`,
            primary: s.name ?? s.code ?? 'Sans nom',
            secondary: `${s.nbParticipants} apprenant${s.nbParticipants > 1 ? 's' : ''} · ${new Date(s.startDate).toLocaleDateString('fr-FR')}`,
            value: fmtEUR.format(s.revenue),
          }))}
        />
        <TopList
          title="Top 5 produits CA"
          icon={BookOpen}
          rows={stats.topProducts.map((p) => ({
            href: `/app/produits/${p.productId}`,
            primary: p.title,
            secondary: `${p.participants} apprenants · ${p.sessions} sessions`,
            value: fmtEUR.format(p.revenue),
          }))}
        />
        <TopList
          title="Top 5 commanditaires"
          icon={Building2}
          rows={stats.topSponsors.map((s) => ({
            href: `/app/organisations/${s.orgId}`,
            primary: s.legalName,
            secondary: `${s.sessions} sessions`,
            value: fmtEUR.format(s.revenue),
          }))}
        />
      </section>

      {/* Chart mois */}
      <section className="glass-panel-strong glass-hover p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-zinc-100 inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mystic-gradient text-white shadow-mystic ring-1 ring-primary/40">
                <BarChart3 className="h-4 w-4" strokeWidth={2} />
              </span>
              Sessions et CA par mois
            </h2>
            <p className="text-xs text-zinc-500 mt-1.5 ml-11">
              Survole les barres pour voir les valeurs exactes
            </p>
          </div>
        </div>
        <MonthlyChart data={stats.byMonth.map((m) => ({ month: m.month, sessions: m.sessions, revenue: m.revenue }))} />
      </section>

      {/* Satisfaction globale + par session — Qualiopi i30 */}
      <SatisfactionOverviewPanel tenantId={user.tenantId} />

      {/* Sessions récentes */}
      <section className="glass-panel-strong glass-hover p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold inline-flex items-center gap-2.5 text-zinc-100">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mystic-gradient text-white shadow-mystic ring-1 ring-primary/40">
              <Calendar className="h-4 w-4" strokeWidth={2} />
            </span>
            Dernières sessions
          </h2>
          <Link
            href="/app/sessions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-halloween-glow group transition-colors"
          >
            Toutes <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {stats.recentSessions.map((s) => (
            <Link
              key={s.id}
              href={`/app/sessions/${s.id}`}
              className="group flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
            >
              <span className="inline-flex items-center justify-center font-mono text-[11px] font-bold text-primary-200 bg-primary/15 ring-1 ring-primary/30 rounded-lg px-2 py-1 shrink-0">{s.code}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate font-semibold text-zinc-100 group-hover:text-halloween-glow transition-colors">{s.name ?? '(sans nom)'}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {new Date(s.startDate).toLocaleDateString('fr-FR')} · {s.nbParticipants} inscrit{s.nbParticipants > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right text-sm shrink-0 flex flex-col items-end gap-1">
                <div className="font-bold tabular-nums text-zinc-50">{fmtEUR.format(s.revenue)}</div>
                <Badge variant="muted">{s.status}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-halloween-glow group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={2} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * KPI prioritaire — format grand pour la section "À l'essentiel" (UX-11).
 * SaaS Premium bold : icône en cercle gradient color-coded, valeur text-3xl bold,
 * hover scale + shadow-card-hover, accent en ring color matching.
 */
function PrioCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'default',
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: 'primary' | 'success' | 'warning' | 'default';
  href?: string;
}) {
  const accentStyles = {
    primary: {
      iconBg: 'bg-mystic-gradient text-white shadow-mystic ring-1 ring-primary/40',
      accentText: 'text-primary-200',
    },
    success: {
      iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_20px_-4px_rgba(16,185,129,0.55)] ring-1 ring-emerald-300/40',
      accentText: 'text-emerald-300',
    },
    warning: {
      iconBg: 'bg-ember-gradient text-white shadow-ember ring-1 ring-halloween-glow/40',
      accentText: 'text-halloween-glow',
    },
    default: {
      iconBg: 'bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-100 shadow-soft ring-1 ring-white/10',
      accentText: 'text-zinc-400',
    },
  }[accent];

  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-300 ease-out ${accentStyles.iconBg}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 leading-none mt-1.5">{label}</span>
      </div>
      <div className="text-3xl font-bold tabular-nums text-zinc-50 leading-none">{value}</div>
      {sub && <div className={`text-xs font-medium mt-2.5 ${accentStyles.accentText}`}>{sub}</div>}
    </>
  );
  const baseCard = `group block glass-panel glass-hover p-5`;
  if (href) {
    return (
      <Link href={href as any} className={baseCard}>
        {inner}
      </Link>
    );
  }
  return <div className={baseCard}>{inner}</div>;
}

function CaCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: number;
  hint?: string;
  accent?: 'primary' | 'success' | 'warning' | 'default';
  href?: string;
}) {
  const iconStyle =
    accent === 'primary' ? 'bg-primary/15 text-primary-200 ring-1 ring-primary/30'
    : accent === 'success' ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
    : accent === 'warning' ? 'bg-halloween-glow/15 text-halloween-glow ring-1 ring-halloween-glow/30'
    : 'bg-white/5 text-zinc-400 ring-1 ring-white/10';
  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconStyle}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="text-lg font-bold tabular-nums text-zinc-50 leading-tight">{fmtEUR.format(value)}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-1">{hint}</div>}
    </>
  );
  const base = 'glass-panel p-4 transition-all duration-300 ease-out';
  if (href) {
    return (
      <Link href={href as any} className={`${base} block glass-hover cursor-pointer`}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function PerfCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel glass-hover p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/10">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="text-lg font-bold tabular-nums text-zinc-50 leading-tight">{value}</div>
    </div>
  );
}

function AlertRow({ label, count, href }: { label: string; count: number; href: string }) {
  if (count === 0) return null;
  return (
    <li>
      <Link
        href={href as any}
        className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="inline-flex items-center gap-2 shrink-0">
          <Badge variant="warning">{count}</Badge>
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-halloween-glow group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={2} />
        </span>
      </Link>
    </li>
  );
}

function PipelineRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href as any}
        className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
      >
        <span className="inline-flex items-center gap-2.5 text-sm font-medium">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-zinc-400 ring-1 ring-white/10 shrink-0 group-hover:bg-primary/15 group-hover:text-primary-200 group-hover:ring-primary/30 transition-all duration-300 ease-out active:scale-[0.97]">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          {label}
        </span>
        <span className="inline-flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tabular-nums text-zinc-50">{value}</span>
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-halloween-glow group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={2} />
        </span>
      </Link>
    </li>
  );
}

function TopList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  rows: Array<{ href: string; primary: string; secondary: string; value: string }>;
}) {
  // Couleurs de médailles pour le top 3
  const medalStyles = [
    'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-soft ring-1 ring-amber-200', // or
    'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-soft ring-1 ring-slate-200', // argent
    'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-soft ring-1 ring-orange-200', // bronze
  ];

  return (
    <section className="glass-panel-strong glass-hover p-6">
      <h2 className="font-bold mb-4 inline-flex items-center gap-2.5 text-base text-zinc-100">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-mystic-gradient text-white shadow-mystic ring-1 ring-primary/40">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">Aucune donnée pour la période sélectionnée.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r, i) => (
            <li key={i}>
              <Link
                href={r.href as any}
                title={r.primary}
                className="group flex gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer"
              >
                <div className={`h-7 w-7 rounded-lg inline-flex items-center justify-center font-bold text-xs shrink-0 tabular-nums ${i < 3 ? medalStyles[i] : 'bg-white/5 text-zinc-400 ring-1 ring-white/10'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-snug break-words text-zinc-100 group-hover:text-halloween-glow transition-colors">{r.primary}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{r.secondary}</span>
                    <span aria-hidden className="text-zinc-700">·</span>
                    <span className="font-bold text-zinc-300 tabular-nums">{r.value}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
