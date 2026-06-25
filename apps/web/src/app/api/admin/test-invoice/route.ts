/**
 * Route admin de test — création d'une facture sans passer par l'UI.
 *
 * ⚠ SÉCURITÉ
 *   - Protégée par un token secret `ADMIN_TEST_TOKEN` (env, jamais commité)
 *   - Si la variable n'est pas définie : route 503 (désactivée par défaut)
 *   - Comparaison token via `timingSafeEqual` (anti timing-attack)
 *   - Action limitée : créer UNE facture pour UN participant existant.
 *     Pas de capacités arbitraires (pas de delete, pas d'update libre).
 *
 * 🎯 USAGE
 *   curl -X POST https://<prod>/api/admin/test-invoice \
 *     -H "Content-Type: application/json" \
 *     -d '{"token":"<ADMIN_TEST_TOKEN>","participantId":"<uuid>"}'
 *
 *   Variantes :
 *   - `participantId` omis → prend automatiquement le 1er participant
 *     en `CONFIRMED` de la 1re session test (code starting with "SES-TEST-").
 *
 * 📦 RÉPONSE
 *   200 { ok:true, invoiceId, number, pdfPath, viewUrl }
 *   401 { ok:false, error:'Token invalide' }
 *   503 { ok:false, error:'ADMIN_TEST_TOKEN non configuré' }
 *   500 { ok:false, error:'…' }
 *
 * 🔥 À SUPPRIMER après les tests (rotation token ou suppression du fichier).
 */

import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma, Prisma } from '@qualiof/db';
import { uploadFile, DOCS_BUCKET } from '@/lib/storage';
import { renderHtmlToPdf } from '@/lib/pdf-render';
import { renderInvoiceHtml, type InvoiceData } from '@/lib/invoice-template';
import { renderOfStandardFooterHtml } from '@/lib/of-pdf-footer';
import { loadOfConfig } from '@/lib/of-config';
import { getNextInvoiceNumber } from '@/lib/numbering';
import { logInvoiceEvent } from '@/lib/invoice-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isTokenValid(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<NextResponse> {
  const expected = process.env.ADMIN_TEST_TOKEN;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_TEST_TOKEN non configuré (min 16 caractères).' },
      { status: 503 },
    );
  }

  let body: { token?: string; participantId?: string; vatRate?: number; dueDateDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 });
  }

  if (!isTokenValid(body.token, expected)) {
    return NextResponse.json({ ok: false, error: 'Token invalide' }, { status: 401 });
  }

  // Résolution du participantId : si omis, prend le 1er CONFIRMED d'une session
  // commençant par "SES-TEST-" (cohérent avec seed:test-session).
  let participantId = body.participantId;
  if (!participantId) {
    const p = await prisma.sessionParticipant.findFirst({
      where: {
        enrollmentStatus: 'CONFIRMED',
        session: { code: { startsWith: 'SES-TEST-' } },
      },
      orderBy: { id: 'asc' },
    });
    if (!p) {
      return NextResponse.json(
        { ok: false, error: 'Aucun participant test trouvé. Lance d\'abord seed:test-session.' },
        { status: 404 },
      );
    }
    participantId = p.id;
  }

  const participant = await prisma.sessionParticipant.findFirst({
    where: { id: participantId },
    include: {
      person: true,
      sponsorOrg: true,
      session: { include: { product: true } },
    },
  });
  if (!participant) {
    return NextResponse.json({ ok: false, error: 'Inscription introuvable' }, { status: 404 });
  }

  // Récupère un user ADMIN du même tenant pour signer les audit logs.
  const adminUser = await prisma.user.findFirst({
    where: { tenantId: participant.session.tenantId, role: 'ADMIN', disabledAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!adminUser) {
    return NextResponse.json(
      { ok: false, error: 'Aucun user ADMIN dans le tenant (impossible de signer l\'audit log).' },
      { status: 500 },
    );
  }

  const of = await loadOfConfig(participant.session.tenantId);
  const session = participant.session;
  const product = session.product;
  const vatRate = body.vatRate ?? 0;
  const dueDays = body.dueDateDays ?? 30;
  const amountHT = Number(participant.priceHT);
  const amountTTC = Math.round(amountHT * (1 + vatRate / 100) * 100) / 100;

  // Création atomique invoice + numérotation (mêmes garanties que createInvoiceFromParticipant).
  const invoice = await prisma.$transaction(async (tx) => {
    const number = await getNextInvoiceNumber(session.tenantId, tx);
    return tx.invoice.create({
      data: {
        tenantId: session.tenantId,
        number,
        status: 'ISSUED',
        participantId: participant.id,
        payerOrgId: participant.sponsorOrg.id,
        amountHT: new Prisma.Decimal(amountHT),
        vatRate: new Prisma.Decimal(vatRate),
        amountTTC: new Prisma.Decimal(amountTTC),
        amountPaid: new Prisma.Decimal(0),
        issueDate: new Date(),
        dueDate: new Date(Date.now() + dueDays * 86400000),
        notes: 'Facture test générée via /api/admin/test-invoice',
      },
    });
  });

  // Génération PDF (Gotenberg/WeasyPrint). Si pas de service joignable en prod,
  // on retourne 200 avec un champ pdfError pour distinguer les deux causes.
  const sponsorAddr = (participant.sponsorOrg.address ?? null) as null | {
    street?: string;
    postalCode?: string;
    city?: string;
  };
  const data: InvoiceData = {
    number: invoice.number,
    issueDate: invoice.issueDate ?? new Date(),
    dueDate: invoice.dueDate ?? new Date(),
    status: invoice.status,
    ofName: of.name,
    ofSiret: of.siret,
    ofRnq: of.rnq,
    ofAddress: of.addressFull,
    ofPhone: of.phone,
    ofEmail: of.email,
    ofTvaIntra: of.tvaIntra || null,
    payerName: participant.sponsorOrg.legalName,
    payerSiret: participant.sponsorOrg.siret,
    payerAddress: sponsorAddr?.street ?? null,
    payerCp: sponsorAddr?.postalCode ?? null,
    payerVille: sponsorAddr?.city ?? null,
    payerEmail: participant.sponsorOrg.email ?? participant.sponsorOrg.emailBilling,
    apprenantNom: participant.person.lastName,
    apprenantPrenom: participant.person.firstName,
    formationTitre: product.title,
    formationCode: session.code,
    formationDateDebut: session.startDate,
    formationDateFin: session.endDate,
    formationDureeHeures: product.durationHours,
    amountHT,
    vatRate,
    amountTTC,
    notes: 'Facture test',
    paymentMethod: 'Virement bancaire',
    paymentIban: of.iban || null,
    paymentBic: of.bic || null,
  };

  let pdfPath: string | null = null;
  let pdfError: string | null = null;
  try {
    const pdfBuffer = await renderHtmlToPdf(renderInvoiceHtml(data), {
      footerHtml: renderOfStandardFooterHtml(of),
    });
    const hash = createHash('sha256').update(pdfBuffer).digest('hex');
    const key = `factures/${invoice.number}-${hash.slice(0, 8)}.pdf`;
    await uploadFile(DOCS_BUCKET, key, pdfBuffer, 'application/pdf');
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl: key, hashSha256: hash },
    });
    await prisma.document.create({
      data: {
        tenantId: session.tenantId,
        type: 'FACTURE',
        entityType: 'invoice',
        entityId: invoice.id,
        pdfUrl: key,
        hashSha256: hash,
        sessionId: session.id,
        participantId: participant.id,
      },
    });
    pdfPath = key;
  } catch (e: any) {
    pdfError = e?.message ?? String(e);
  }

  await prisma.sessionParticipant.update({
    where: { id: participant.id },
    data: { invoiceSent: true, invoiceSentAt: new Date() },
  });

  await logInvoiceEvent({
    tenantId: session.tenantId,
    actorUserId: adminUser.id,
    targetInvoiceId: invoice.id,
    action: 'invoices.created',
    diff: {
      via: 'admin-test-route',
      amountHt: Number(invoice.amountHT),
      amountTtc: Number(invoice.amountTTC),
      participantId: invoice.participantId,
      number: invoice.number,
    },
  });

  return NextResponse.json({
    ok: true,
    invoiceId: invoice.id,
    number: invoice.number,
    participantName: `${participant.person.firstName} ${participant.person.lastName}`,
    sponsor: participant.sponsorOrg.legalName,
    amountHT,
    amountTTC,
    pdfPath,
    pdfError,
    viewUrl: `/app/factures/${invoice.id}`,
  });
}
