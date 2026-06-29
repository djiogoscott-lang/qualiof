/**
 * One-shot : récupère une facture (par défaut FAC-000001) depuis la BDD
 * et écrit son PDF dans c:\tmp\test-invoice-<number>.pdf, sans toucher
 * à la BDD ni à R2. Utilise le Gotenberg local (GOTENBERG_URL).
 *
 * Usage :
 *   pnpm --filter @qualiof/web exec tsx scripts/dump-test-invoice-pdf.ts
 *   pnpm --filter @qualiof/web exec tsx scripts/dump-test-invoice-pdf.ts FAC-000002
 *
 * Out: c:\tmp\test-invoice-FAC-XXXXXX.pdf (créé / écrasé)
 */

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@qualiof/db';
import { renderHtmlToPdf } from '../src/lib/pdf-render';
import { renderInvoiceHtml, type InvoiceData } from '../src/lib/invoice-template';
import { renderOfStandardFooterHtml } from '../src/lib/of-pdf-footer';
import { loadOfConfig } from '../src/lib/of-config';

const OUT_DIR = 'c:\\tmp';

async function main() {
  const number = process.argv[2] ?? 'FAC-000001';
  console.log(`→ Recherche facture ${number}…`);

  const invoice = await prisma.invoice.findFirst({
    where: { number },
    include: {
      participant: {
        include: {
          person: true,
          sponsorOrg: true,
          session: { include: { product: true } },
        },
      },
    },
  });
  if (!invoice) {
    console.error(`Facture ${number} introuvable.`);
    process.exit(1);
  }
  const participant = invoice.participant;
  if (!participant) {
    console.error(`Facture ${number} sans participant lié.`);
    process.exit(1);
  }

  const of = await loadOfConfig(invoice.tenantId);
  const session = participant.session;
  const product = session.product;
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
    amountHT: Number(invoice.amountHT),
    vatRate: Number(invoice.vatRate),
    amountTTC: Number(invoice.amountTTC),
    notes: invoice.notes ?? null,
    paymentMethod: 'Virement bancaire',
    paymentIban: of.iban || null,
    paymentBic: of.bic || null,
  };

  console.log('→ Rendu HTML…');
  const html = renderInvoiceHtml(data);
  console.log('→ Appel Gotenberg…');
  const pdf = await renderHtmlToPdf(html, { footerHtml: renderOfStandardFooterHtml(of) });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `test-invoice-${number}.pdf`);
  fs.writeFileSync(outPath, pdf);
  console.log(`✓ PDF écrit : ${outPath} (${(pdf.length / 1024).toFixed(1)} ko)`);
  console.log(`\nOuvre-le : start "" "${outPath}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
