import { redirect } from 'next/navigation';
import { Newspaper, AlertTriangle } from 'lucide-react';
import { validateRequest } from '@/lib/auth';
import { prisma } from '@qualiof/db';
import { daysSince } from '@/lib/veille/days-since';
import { childLogger } from '@/lib/logger';
import { PageHeader } from '@/components/ui/page-header';
import { VeilleTabsClient } from '@/components/veille/veille-tabs-client';
import { VeilleTable } from '@/components/veille/veille-table';
import { VeilleInbox } from '@/components/veille/veille-inbox';
import { DaysSinceBadge } from '@/components/veille/days-since-badge';
import { AddVeilleDialog } from '@/components/veille/add-veille-dialog';
import { ExportPdfButton } from '@/components/veille/export-pdf-button';
import { shouldShowInbox, parseTab, tabToTheme } from './page-helpers';

const log = childLogger('app/veille');

/**
 * Petit fallback UI affiché si une query Prisma plante (table manquante,
 * migration non appliquée, etc.). On ne crash plus toute la page Veille.
 */
function VeilleErrorFallback({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-amber-900">
          Impossible de charger la veille
        </h3>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          {message} Les données Qualiopi ne sont pas accessibles pour l'instant.
          Recharge la page dans quelques secondes, ou contacte l'administrateur
          si le problème persiste.
        </p>
      </div>
    </div>
  );
}

/**
 * Page /app/veille — Veille Qualiopi (Phase 13 Plan 13-03 — VEILLE-02).
 *
 * Server Component qui rend pour 3 rôles (ADMIN, MANAGER, LECTEUR) :
 *  - ADMIN/MANAGER : 4 onglets thématiques (INDIC_23/24/25/26) + onglet inbox
 *    (suggestions auto en DRAFT) + édition inline / dialogs CRUD / export PDF.
 *  - LECTEUR : 4 onglets thématiques UNIQUEMENT (D-03 — inbox strictement masqué).
 *    Pas d'édition, pas d'export, juste consultation des entrées ACTIVE.
 *
 * Defense-in-depth D-03 : si LECTEUR demande explicitement `?tab=inbox` en URL,
 * la page redirect vers `?tab=indic_23` (pas seulement filtré côté client).
 *
 * URL state (pattern Phase 9.1 product-tabs) :
 *  - `?tab=indic_23|indic_24|indic_25|indic_26|inbox` (default = indic_23)
 *  - `?q=...` (filtre titre/source — futur — non câblé V1)
 *  - `?responsable=...` (filtre — futur — non câblé V1)
 *  - `?freq=...` (filtre — futur — non câblé V1)
 *
 * Multi-tenant : toutes les queries scopées par `tenantId: user.tenantId`.
 *
 * KPI "X jours depuis dernière revue" (daysSince helper Plan 02) : badge couleur
 * < 30j vert, 30-89j ambre, ≥ 90j rouge — calculé sur la dernière revue ACTIVE
 * du thème courant (pas sur l'entrée la plus récente).
 */

export const dynamic = 'force-dynamic';

interface SearchParams {
  tab?: string;
  q?: string;
  responsable?: string;
  freq?: string;
}

export default async function VeillePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await validateRequest();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const canSeeInbox = shouldShowInbox(user);
  const canEdit = user.role === 'ADMIN' || user.role === 'MANAGER';

  // D-03 defense-in-depth : LECTEUR qui force ?tab=inbox dans l'URL → redirect.
  if (sp.tab === 'inbox' && !canSeeInbox) {
    redirect('/app/veille?tab=indic_23');
  }

  const tab = parseTab(sp.tab, canSeeInbox);

  // Inbox count (pour badge dans la nav des onglets) — seulement si l'inbox est visible.
  // Best-effort : si le count plante (DB indisponible), on affiche 0 plutôt que
  // de crasher toute la page.
  let inboxCount = 0;
  if (canSeeInbox) {
    try {
      inboxCount = await prisma.regulatoryWatch.count({
        where: {
          tenantId: user.tenantId,
          status: 'DRAFT',
          suggestedBy: 'AUTO',
        },
      });
    } catch (e) {
      log.error(
        { err: { message: (e as Error).message }, userId: user.id },
        'veille.inboxCount.failed',
      );
    }
  }

  // ─── Branche INBOX ───────────────────────────────────────────────────────
  if (tab === 'inbox') {
    let suggestions: Awaited<ReturnType<typeof prisma.regulatoryWatch.findMany>> = [];
    let fetchError: string | null = null;
    try {
      suggestions = await prisma.regulatoryWatch.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'DRAFT',
          suggestedBy: 'AUTO',
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      fetchError = (e as Error).message ?? 'Erreur inconnue';
      log.error(
        { err: { message: fetchError }, userId: user.id },
        'veille.inbox.fetch.failed',
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Veille Qualiopi"
            subtitle="Critère 6 — indicateurs 23 / 24 / 25 / 26"
          />
          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Inbox — suggestions automatiques</span>
          </div>
        </div>

        <VeilleTabsClient
          activeTab={tab}
          canSeeInbox={canSeeInbox}
          inboxCount={inboxCount}
        />

        {fetchError ? (
          <VeilleErrorFallback message={fetchError} />
        ) : (
          <VeilleInbox suggestions={suggestions} />
        )}
      </div>
    );
  }

  // ─── Branche THÉMATIQUE (indic_23/24/25/26) ─────────────────────────────
  const theme = tabToTheme(tab);
  // theme ne peut pas être null ici car tab !== 'inbox' (early return ci-dessus).
  if (!theme) redirect('/app/veille?tab=indic_23');

  const statusFilter = canEdit
    ? { in: ['ACTIVE', 'DRAFT'] as const }
    : 'ACTIVE';

  type WatchWhere = Record<string, unknown>;
  const where: WatchWhere = {
    tenantId: user.tenantId,
    theme,
    status: statusFilter,
  };
  if (sp.responsable) {
    where.responsable = { contains: sp.responsable, mode: 'insensitive' };
  }
  if (sp.freq) {
    where.frequency = { contains: sp.freq, mode: 'insensitive' };
  }
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q, mode: 'insensitive' } },
      { source: { contains: sp.q, mode: 'insensitive' } },
    ];
  }

  // Best-effort : si une des 2 queries plante, on dégrade gracieusement.
  let watches: Awaited<ReturnType<typeof prisma.regulatoryWatch.findMany>> = [];
  let lastReview: { dateLastReviewed: Date | null } | null = null;
  let fetchError: string | null = null;
  try {
    [watches, lastReview] = await Promise.all([
      prisma.regulatoryWatch.findMany({
        where: where as never,
        orderBy: [{ dateLastReviewed: 'desc' }, { dateAdded: 'desc' }],
      }),
      prisma.regulatoryWatch.findFirst({
        where: {
          tenantId: user.tenantId,
          theme,
          status: 'ACTIVE',
          dateLastReviewed: { not: null },
        },
        orderBy: { dateLastReviewed: 'desc' },
        select: { dateLastReviewed: true },
      }),
    ]);
  } catch (e) {
    fetchError = (e as Error).message ?? 'Erreur inconnue';
    log.error(
      { err: { message: fetchError }, userId: user.id, theme },
      'veille.theme.fetch.failed',
    );
  }

  const days = daysSince(lastReview?.dateLastReviewed ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Veille Qualiopi"
          subtitle="Critère 6 — indicateurs 23 / 24 / 25 / 26"
        />
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sources réglementaires & sectorielles</span>
        </div>
      </div>

      <VeilleTabsClient
        activeTab={tab}
        canSeeInbox={canSeeInbox}
        inboxCount={inboxCount}
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <DaysSinceBadge days={days} />
        <div className="flex items-center gap-2">
          {canEdit && <ExportPdfButton theme={theme} />}
          {canEdit && <AddVeilleDialog defaultTheme={theme} />}
        </div>
      </div>

      {fetchError ? (
        <VeilleErrorFallback message={fetchError} />
      ) : (
        <VeilleTable watches={watches} canEdit={canEdit} />
      )}
    </div>
  );
}
