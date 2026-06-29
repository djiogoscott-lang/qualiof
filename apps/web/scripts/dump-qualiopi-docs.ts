/**
 * Trousse de prévisualisation locale des PDFs Qualiopi.
 *
 * Génère en local, sans toucher à la BDD ni au cloud R2, les 4 documents
 * clés pour un apprenant d'une session :
 *   - ATTESTATION de fin de formation (closure renderer)
 *   - CERTIFICAT de réalisation (closure renderer)
 *   - PROGRAMME pédagogique (template + WeasyPrint)
 *   - CONVENTION de formation (template + WeasyPrint)
 *
 * Sortie : Bureau\qualiof-dump-{sessionCode}\<doc>-<apprenant>.pdf
 *
 * Pré-requis :
 *   - Docker Desktop UP avec gotenberg + weasyprint
 *   - DATABASE_URL valide (récupère un participant existant)
 *
 * Usage :
 *   pnpm --filter @qualiof/web dump:qualiopi              # défaut SES-TEST-Q02Y
 *   pnpm --filter @qualiof/web dump:qualiopi SES-2026-01  # autre session
 *
 *   # Choisir l'apprenant par index (0 = premier CONFIRMED)
 *   pnpm --filter @qualiof/web dump:qualiopi SES-TEST-Q02Y 1
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prisma } from '@qualiof/db';
import { renderClosureDoc } from '../src/lib/closure/renderer';
import { renderProgrammeHtml, type ProgrammeData } from '../src/lib/programme-template';
import {
  renderConventionHtml,
  type ConventionData,
  type ConventionStagiaire,
} from '../src/lib/convention-template';
import { renderHtmlToPdfWeasy } from '../src/lib/pdf-render';
import { loadOfConfig } from '../src/lib/of-config';
import type { ClosureContext } from '../src/lib/closure/shared-template';

const DESKTOP = path.join(os.homedir(), 'Desktop');

function safeSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function main() {
  const sessionCode = process.argv[2] ?? 'SES-TEST-Q02Y';
  const participantIndex = parseInt(process.argv[3] ?? '0', 10);

  console.log(`→ Session ${sessionCode}, apprenant index ${participantIndex}`);

  const session = await prisma.trainingSession.findFirst({
    where: { code: sessionCode },
    include: {
      product: true,
      location: true,
      trainers: {
        include: { person: true },
        orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
      },
      participants: {
        where: { enrollmentStatus: 'CONFIRMED' },
        orderBy: { id: 'asc' },
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
          sponsorOrg: true,
        },
      },
    },
  });
  if (!session) {
    console.error(`Session ${sessionCode} introuvable.`);
    process.exit(1);
  }
  const participant = session.participants[participantIndex];
  if (!participant) {
    console.error(
      `Pas d'apprenant CONFIRMED à l'index ${participantIndex} (${session.participants.length} dispo).`,
    );
    process.exit(1);
  }

  const product = session.product;
  const primaryLink = participant.person.legalLinks[0] ?? null;
  const entreprise = primaryLink?.organization.legalName ?? null;
  const of = await loadOfConfig(session.tenantId);

  const sessionLocation = session.location
    ? `${session.location.name}${(session.location.address as { city?: string } | null)?.city ? ` — ${(session.location.address as { city?: string }).city}` : ''}`
    : null;

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
    tenantId: session.tenantId,
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

  const outDir = path.join(DESKTOP, `qualiof-dump-${sessionCode}`);
  fs.mkdirSync(outDir, { recursive: true });
  const apprenantSlug = safeSlug(`${participant.person.lastName}-${participant.person.firstName}`);

  // 1. ATTESTATION
  console.log('→ ATTESTATION…');
  const att = await renderClosureDoc('ATTESTATION', ctx);
  fs.writeFileSync(path.join(outDir, `attestation-${apprenantSlug}.pdf`), att.pdfBuffer);
  console.log(`  ✓ attestation-${apprenantSlug}.pdf (${(att.pdfBuffer.length / 1024).toFixed(1)} ko)`);

  // 2. CERTIFICAT
  console.log('→ CERTIFICAT…');
  const cert = await renderClosureDoc('CERTIFICAT', ctx);
  fs.writeFileSync(path.join(outDir, `certificat-${apprenantSlug}.pdf`), cert.pdfBuffer);
  console.log(`  ✓ certificat-${apprenantSlug}.pdf (${(cert.pdfBuffer.length / 1024).toFixed(1)} ko)`);

  // 3. PROGRAMME
  console.log('→ PROGRAMME…');
  const programmeData: ProgrammeData = {
    apprenantPrenom: participant.person.firstName,
    apprenantNom: participant.person.lastName,
    apprenantEmail: participant.person.email,
    sessionCode: session.code,
    sessionName: session.name ?? product.title,
    sessionStartDate: session.startDate,
    sessionEndDate: session.endDate,
    sessionLieu: sessionLocation,
    sessionModalite: session.modality,
    sessionFormateurs: session.trainers.map((t) => `${t.person.firstName} ${t.person.lastName}`),
    produitTitre: product.title,
    produitCode: product.code,
    produitDureeHeures: product.durationHours,
    produitPriceHT: Number(product.priceHT),
    produitObjectifs: Array.isArray(product.objectives) ? (product.objectives as string[]) : [],
    produitProgrammeMd: product.programMd ?? '',
    produitPrerequisites: product.prerequisites,
    produitTargetAudience: product.targetAudience,
    produitPedagogicalMethods: product.pedagogicalMethods,
    produitEvaluationMethods: product.evaluationMethods,
    produitAccessibility: product.accessibility,
    produitAccessConditions: product.accessConditions,
    produitTrainerProfile: product.trainerProfile,
    produitPedagogicalSupport: product.pedagogicalSupport,
    ofName: of.name,
    ofSiret: of.siret,
    ofAddress: of.addressFull,
    ofRnq: of.rnq,
    ofPhone: of.phone,
    ofEmail: of.email,
    tenantId: session.tenantId,
  };
  const programmePdf = await renderHtmlToPdfWeasy(renderProgrammeHtml(programmeData, of));
  fs.writeFileSync(path.join(outDir, `programme-${apprenantSlug}.pdf`), programmePdf);
  console.log(`  ✓ programme-${apprenantSlug}.pdf (${(programmePdf.length / 1024).toFixed(1)} ko)`);

  // 4. CONVENTION
  console.log('→ CONVENTION…');
  const linkToSponsor = participant.person.legalLinks.find(
    (l) => l.organizationId === participant.sponsorOrgId,
  );
  const isSelfEmployed = linkToSponsor?.role === 'EI_SELF';
  const representantNom = isSelfEmployed
    ? `${participant.person.firstName} ${participant.person.lastName.toUpperCase()}`.trim()
    : (participant.sponsorOrg.representative?.trim() ||
        `${participant.person.firstName} ${participant.person.lastName.toUpperCase()}`.trim());
  const stagiaires: ConventionStagiaire[] = [
    {
      prenom: participant.person.firstName,
      nom: participant.person.lastName,
      email: participant.person.email,
    },
  ];
  const orgAddr = (participant.sponsorOrg.address as Record<string, string> | null) ?? null;
  const rcsVille = orgAddr?.city ?? null;
  const conventionData: ConventionData = {
    beneficiaireRaisonSociale: participant.sponsorOrg.legalName,
    beneficiaireSiret: participant.sponsorOrg.siret,
    beneficiaireRcsVille: rcsVille,
    beneficiaireRepresentantNom: representantNom,
    stagiaires,
    sessionStartDate: session.startDate,
    sessionEndDate: session.endDate,
    sessionLieu: sessionLocation ?? of.addressFull,
    produitTitre: session.name ?? product.title,
    produitDureeHeures: product.durationHours,
    produitObjectifs: Array.isArray(product.objectives) ? (product.objectives as string[]) : [],
    produitProgrammeMd: typeof product.programMd === 'string' ? product.programMd : '',
    produitTrainerProfile: product.trainerProfile,
    produitPriceHTPerStagiaire: Number(participant.priceHT) || Number(product.priceHT),
    tenantId: session.tenantId,
  };
  const conventionPdf = await renderHtmlToPdfWeasy(renderConventionHtml(conventionData, of));
  fs.writeFileSync(path.join(outDir, `convention-${apprenantSlug}.pdf`), conventionPdf);
  console.log(`  ✓ convention-${apprenantSlug}.pdf (${(conventionPdf.length / 1024).toFixed(1)} ko)`);

  console.log(`\n✓ 4 PDFs écrits dans : ${outDir}`);
  console.log('  Ouvre le dossier dans l\'explorateur :');
  console.log(`    Invoke-Item "${outDir}"`);
}

main()
  .catch((e) => {
    console.error('\n✗ Erreur :', e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
