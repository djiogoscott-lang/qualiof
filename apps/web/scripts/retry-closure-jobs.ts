/**
 * One-shot : ré-exécute synchroniquement (sans BullMQ) les ClosureJob en
 * status='ERROR' filtrés par sessionCode + kind. Mime exactement ce que
 * processClosureJob fait dans le worker, en s'épargnant la queue Redis.
 *
 * Usage :
 *   pnpm --filter @qualiof/web exec dotenv -e ../../.env -- \
 *     tsx scripts/retry-closure-jobs.ts SES-TEST-Q02Y ANALYSE_BESOIN
 *
 *   # Tous les kinds en erreur de la session :
 *   tsx scripts/retry-closure-jobs.ts SES-TEST-Q02Y
 *
 * Pré-requis :
 *   - Gotenberg (port 3001) UP
 *   - WeasyPrint (port 5001) UP pour les docs Qualiopi assistés
 *   - DATABASE_URL valide
 *   - S3 (R2) valide pour l'upload
 */

import { createHash } from 'node:crypto';
import { prisma, type ClosureDocKind, type DocType, type PedagogicalKind } from '@qualiof/db';
import { uploadFile, DOCS_BUCKET } from '../src/lib/storage';
import { renderClosureDoc } from '../src/lib/closure/renderer';
import { loadOfConfig } from '../src/lib/of-config';
import type { ClosureContext } from '../src/lib/closure/shared-template';

const DOC_TYPE_BY_KIND: Partial<Record<ClosureDocKind, DocType>> = {
  ATTESTATION: 'ATTESTATION_FIN',
  CERTIFICAT: 'CERTIFICAT_REALISATION',
};

const PEDAGOGICAL_KIND_BY_KIND: Partial<Record<ClosureDocKind, PedagogicalKind>> = {
  QCM: 'QCM',
  GRILLE_OBS: 'GRILLE_OBS',
  ANALYSE_BESOIN: 'ANALYSE_BESOIN',
  POSITIONNEMENT: 'POSITIONNEMENT',
  SATISFACTION_CHAUD: 'SATISFACTION_CHAUD',
  SATISFACTION_FROID: 'SATISFACTION_FROID',
  DEROULE_PEDA: 'DEROULE',
  EMARGEMENT: 'EMARGEMENT',
};

async function processOne(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const job = await prisma.closureJob.findUnique({
    where: { id: jobId },
    include: { batch: true },
  });
  if (!job) return { ok: false, error: 'Job introuvable' };

  // 1. Marque PROCESSING + reset errorMessage
  await prisma.closureJob.update({
    where: { id: jobId },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
      errorMessage: null,
      attempts: { increment: 1 },
    },
  });

  try {
    const participant = await prisma.sessionParticipant.findFirst({
      where: { id: job.participantId, session: { tenantId: job.batch.tenantId } },
      include: {
        person: {
          include: {
            legalLinks: {
              where: { role: { in: ['EI_SELF', 'AGENT_COMMERCIAL', 'DIRIGEANT', 'SALARIE'] } },
              orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
              include: { organization: { select: { legalName: true, brandName: true } } },
            },
          },
        },
        session: {
          include: {
            product: true,
            location: true,
            trainers: {
              include: { person: true },
              orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            },
          },
        },
      },
    });
    if (!participant) throw new Error(`Inscription introuvable : ${job.participantId}`);

    const session = participant.session;
    const product = session.product;
    const sessionLocation = session.location
      ? `${session.location.name}${(session.location.address as { city?: string } | null)?.city ? ` — ${(session.location.address as { city?: string }).city}` : ''}`
      : null;
    const primaryLink = participant.person.legalLinks[0] ?? null;
    const entreprise = primaryLink?.organization.legalName ?? null;
    const of = await loadOfConfig(job.batch.tenantId);

    const ctx: ClosureContext = {
      apprenantPrenom: participant.person.firstName,
      apprenantNom: participant.person.lastName,
      apprenantCivility: participant.person.civility ?? null,
      sessionId: session.id,
      sessionCode: session.code,
      sessionTitle: product.title,
      sessionStartDate: session.startDate,
      sessionEndDate: session.endDate,
      sessionLocation,
      sessionTrainers: (() => {
        const primary = session.trainers.find((t) => t.isPrimary) ?? session.trainers[0];
        return primary ? [`${primary.person.firstName} ${primary.person.lastName}`.trim()] : [];
      })(),
      durationHours: product.durationHours,
      tenantId: job.batch.tenantId,
      of,
      formationMeta: { programmeMd: product.programMd ?? '' },
      stagiaireMeta: {
        entreprise,
        fonction: primaryLink?.function ?? null,
        anciennete: participant.person.professionalExperience ?? null,
        diplomes: participant.person.diplomas ?? null,
        professionalStatus: participant.person.professionalStatus ?? null,
      },
    };

    const { pdfBuffer, rawJson, usedStub } = await renderClosureDoc(job.kind, ctx);

    const hash = createHash('sha256').update(pdfBuffer).digest('hex');
    const safePersonSlug = `${participant.person.lastName}-${participant.person.firstName}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .toLowerCase();
    const key = `closure/${job.batch.tenantId}/${session.code}/${job.batchId}/${safePersonSlug}-${job.kind.toLowerCase()}-${hash.slice(0, 8)}.pdf`;
    await uploadFile(DOCS_BUCKET, key, pdfBuffer, 'application/pdf');

    let documentId: string | null = null;
    let pedagogicalAssetId: string | null = null;

    const docType = DOC_TYPE_BY_KIND[job.kind];
    if (docType) {
      const doc = await prisma.document.create({
        data: {
          tenantId: job.batch.tenantId,
          type: docType,
          entityType: 'participant',
          entityId: job.participantId,
          pdfUrl: key,
          hashSha256: hash,
          sessionId: session.id,
          participantId: job.participantId,
        },
      });
      documentId = doc.id;
    }

    const pedKind = PEDAGOGICAL_KIND_BY_KIND[job.kind];
    if (pedKind) {
      const asset = await prisma.pedagogicalAsset.upsert({
        where: {
          sessionId_participantId_kind: {
            sessionId: session.id,
            participantId: job.participantId,
            kind: pedKind,
          },
        },
        update: {
          rawJson: (rawJson ?? {}) as object,
          pdfUrl: key,
          hashSha256: hash,
          generatedAt: new Date(),
        },
        create: {
          tenantId: job.batch.tenantId,
          sessionId: session.id,
          participantId: job.participantId,
          kind: pedKind,
          rawJson: (rawJson ?? {}) as object,
          pdfUrl: key,
          hashSha256: hash,
        },
      });
      pedagogicalAssetId = asset.id;
    }

    await prisma.closureJob.update({
      where: { id: jobId },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        documentId,
        pedagogicalAssetId,
        usedStub: Boolean(usedStub),
        errorMessage: null,
      },
    });

    // Décrémente errorDocs, incrémente doneDocs sur le batch
    await prisma.closureBatch.update({
      where: { id: job.batchId },
      data: {
        errorDocs: { decrement: 1 },
        doneDocs: { increment: 1 },
      },
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.closureJob.update({
      where: { id: jobId },
      data: { status: 'ERROR', errorMessage: msg.slice(0, 500) },
    });
    return { ok: false, error: msg };
  }
}

async function main() {
  const sessionCode = process.argv[2];
  const kindFilter = process.argv[3] as ClosureDocKind | undefined;
  if (!sessionCode) {
    console.error('Usage: tsx scripts/retry-closure-jobs.ts <sessionCode> [kind]');
    process.exit(1);
  }

  console.log(`→ Recherche ClosureJob ERROR sur session ${sessionCode}${kindFilter ? ` / ${kindFilter}` : ''}…`);

  const session = await prisma.trainingSession.findFirst({
    where: { code: sessionCode },
    select: { id: true, code: true },
  });
  if (!session) {
    console.error(`Session ${sessionCode} introuvable.`);
    process.exit(1);
  }

  const jobs = await prisma.closureJob.findMany({
    where: {
      status: 'ERROR',
      batch: { sessionId: session.id },
      ...(kindFilter ? { kind: kindFilter } : {}),
    },
    select: { id: true, kind: true, participantId: true },
  });

  console.log(`→ ${jobs.length} job(s) à relancer.`);
  if (jobs.length === 0) {
    console.log('Rien à faire.');
    return;
  }

  let ok = 0;
  let ko = 0;
  for (const j of jobs) {
    process.stdout.write(`  · ${j.kind} (${j.id.slice(0, 8)}) … `);
    const r = await processOne(j.id);
    if (r.ok) {
      console.log('✓ DONE');
      ok++;
    } else {
      console.log(`✗ ${r.error}`);
      ko++;
    }
  }

  console.log(`\n→ Résultat : ${ok} OK, ${ko} KO`);

  // Re-finalise le batch si tout est traité
  const batchIds = Array.from(
    new Set(
      (
        await prisma.closureJob.findMany({
          where: { id: { in: jobs.map((j) => j.id) } },
          select: { batchId: true },
        })
      ).map((j) => j.batchId),
    ),
  );
  for (const batchId of batchIds) {
    const batch = await prisma.closureBatch.findUnique({
      where: { id: batchId },
      select: { totalDocs: true, doneDocs: true, errorDocs: true, status: true },
    });
    if (!batch) continue;
    const handled = batch.doneDocs + batch.errorDocs;
    if (handled >= batch.totalDocs) {
      const next = batch.errorDocs === 0 ? 'COMPLETED' : batch.doneDocs === 0 ? 'FAILED' : 'PARTIAL';
      await prisma.closureBatch.update({
        where: { id: batchId },
        data: { status: next, completedAt: new Date() },
      });
      console.log(`→ Batch ${batchId.slice(0, 8)} finalisé en ${next}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
