/**
 * Seed test session — génère 1 formateur + 1 session + 3 apprenants avec
 * des données factices réalistes via @faker-js/faker (locale fr).
 *
 * Usage :
 *   pnpm seed:test-session
 *
 * Sortie : log de tous les IDs créés. Utiliser ces IDs dans l'UI :
 *   - http://localhost:3000/app/sessions/[sessionId]
 *   - http://localhost:3000/app/apprenants/[personId]
 *
 * SÉCURITÉ : ce script REFUSE de s'exécuter si NODE_ENV === 'production'
 * pour éviter une pollution accidentelle d'une base de prod.
 *
 * Idempotence : non garantie. Chaque exécution crée de nouveaux records
 * (Persons / Org / Session uniques via faker). Pour reset, voir db:reset.
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
loadEnv({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import { PrismaClient, LegalForm, LinkRole, Modality, SessionStatus, EnrollmentStatus } from '@prisma/client';
import { fakerFR as faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const TENANT_NAME = process.env.TENANT_DEFAULT_NAME ?? 'Start Academy';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ seed-test-session refuse de tourner en production (NODE_ENV=production).');
    process.exit(1);
  }

  console.log('🌱 Seed test session — démarrage');

  // ─────────────────────────────────────────────────────────────
  // 1. Tenant (créé par seed.ts principal — on le récupère)
  // ─────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
  if (!tenant) {
    console.error(`❌ Tenant "${TENANT_NAME}" introuvable. Lance d'abord : pnpm db:seed`);
    process.exit(1);
  }
  console.log(`✓ tenant = ${tenant.name} (${tenant.id})`);

  // ─────────────────────────────────────────────────────────────
  // 2. Formateur (Person sans Organization — formateur indépendant)
  // ─────────────────────────────────────────────────────────────
  const trainerFirstName = faker.person.firstName();
  const trainerLastName = faker.person.lastName().toUpperCase();
  const trainer = await prisma.person.create({
    data: {
      tenantId: tenant.id,
      civility: faker.helpers.arrayElement(['M.', 'Mme']),
      firstName: trainerFirstName,
      lastName: trainerLastName,
      email: faker.internet.email({ firstName: trainerFirstName, lastName: trainerLastName }).toLowerCase(),
      phone: faker.phone.number({ style: 'national' }),
      professionalStatus: 'Formateur indépendant',
      diplomas: 'Master Sciences de l\'Éducation — Université Paris Cité',
      professionalExperience: '12 ans',
      educationLevel: 'Bac+5',
    },
  });
  console.log(`✓ formateur = ${trainer.firstName} ${trainer.lastName} (${trainer.id})`);

  // ─────────────────────────────────────────────────────────────
  // 3. TrainingProduct (le programme de formation)
  // ─────────────────────────────────────────────────────────────
  const productCode = `TEST-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`;
  const product = await prisma.trainingProduct.create({
    data: {
      tenantId: tenant.id,
      code: productCode,
      title: 'IA & Prospection immobilière — Cycle initiation 21h',
      durationHours: 21,
      modality: Modality.PRESENTIEL,
      prerequisites: 'Connaissance des outils bureautiques (Word, Excel). Carte T ou attestation collaborateur.',
      targetAudience: 'Agents commerciaux immobiliers, négociateurs, dirigeants d\'agences',
      objectives: [
        'Maîtriser les fondamentaux de l\'IA générative appliquée à l\'immobilier',
        'Construire un workflow de prospection augmenté par l\'IA',
        'Évaluer la fiabilité et les biais d\'une réponse LLM',
      ],
      programMd: `# Programme — IA & Prospection immobilière

## Module 1 — Fondamentaux IA (7h)
- Histoire et état de l'art LLM
- Cas d'usage immobilier
- Atelier : premier prompt structuré

## Module 2 — Prospection augmentée (7h)
- Génération de mailing personnalisé
- Qualification de leads via IA
- Atelier : pipeline prospection ChatGPT + CRM

## Module 3 — Évaluation et limites (7h)
- Détection des hallucinations
- RGPD et données clients
- Atelier : audit de fiabilité`,
      pedagogicalMethods: 'Alternance théorie / pratique, 60% d\'ateliers individuels et collectifs sur cas réels',
      evaluationMethods: 'QCM final (note ≥ 65% pour validation) + grille d\'observation continue + auto-positionnement',
      accessibility: 'Locaux PMR. Adaptations possibles sur demande (sous-titrage, document agrandi, pause supplémentaire).',
      trainerProfile: 'Formateur consultant en IA, 12+ ans d\'expérience, Master 2 Sciences de l\'Éducation',
      priceHT: 1800.0,
      vatRate: 0.0,
      capacityMin: 3,
      capacityMax: 8,
      theme: 'IA',
    },
  });
  console.log(`✓ produit = ${product.code} — ${product.title}`);

  // ─────────────────────────────────────────────────────────────
  // 4. Location (lieu de formation)
  // ─────────────────────────────────────────────────────────────
  const city = faker.location.city();
  const location = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: `Centre de formation Start Academy — ${city}`,
      address: {
        line1: faker.location.streetAddress(),
        postalCode: faker.location.zipCode('#####'),
        city,
        country: 'France',
      },
      capacity: 12,
    },
  });
  console.log(`✓ lieu = ${location.name}`);

  // ─────────────────────────────────────────────────────────────
  // 5. TrainingSession + SessionTrainer
  // ─────────────────────────────────────────────────────────────
  const startDate = faker.date.soon({ days: 30 });
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 2); // 3 jours de 7h = 21h
  endDate.setHours(17, 0, 0, 0);
  const sessionCode = `SES-TEST-${faker.string.alphanumeric({ length: 4, casing: 'upper' })}`;

  const session = await prisma.trainingSession.create({
    data: {
      tenantId: tenant.id,
      productId: product.id,
      code: sessionCode,
      name: `${product.title} — ${startDate.toLocaleDateString('fr-FR')}`,
      status: SessionStatus.PLANNED,
      startDate,
      endDate,
      locationId: location.id,
      modality: Modality.PRESENTIEL,
      capacityMin: 3,
      capacityMax: 8,
      pricePerLearner: 1800.0,
    },
  });

  await prisma.sessionTrainer.create({
    data: {
      sessionId: session.id,
      personId: trainer.id,
      role: 'Formateur principal',
      dailyRate: 800.0,
      isPrimary: true,
    },
  });
  console.log(`✓ session = ${session.code} (${session.startDate.toLocaleDateString('fr-FR')} → ${session.endDate.toLocaleDateString('fr-FR')})`);

  // ─────────────────────────────────────────────────────────────
  // 6. 3 Apprenants — Person + Organization (EI) + LegalLink + SessionParticipant
  //    Pattern dominant Start Academy : agent commercial immobilier = EI propriétaire.
  // ─────────────────────────────────────────────────────────────
  const apprenants = [];
  for (let i = 0; i < 3; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName().toUpperCase();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Person
    const person = await prisma.person.create({
      data: {
        tenantId: tenant.id,
        civility: faker.helpers.arrayElement(['M.', 'Mme']),
        firstName,
        lastName,
        birthDate: faker.date.birthdate({ min: 25, max: 60, mode: 'age' }),
        email,
        phone: faker.phone.number({ style: 'national' }),
        professionalStatus: 'Agent commercial',
        professionalExperience: faker.helpers.arrayElement(['1-3 ans', '4 ans', '5 ans', '7 ans', '10 ans']),
        educationLevel: faker.helpers.arrayElement(['Bac+2', 'Bac+3', 'Bac+5']),
        diplomas: 'BTS Professions immobilières',
        personalAddress: {
          line1: faker.location.streetAddress(),
          postalCode: faker.location.zipCode('#####'),
          city: faker.location.city(),
          country: 'France',
        },
        rgpdConsentAt: new Date(),
      },
    });

    // Organization (EI = entreprise individuelle de l'agent)
    const enseigne = faker.helpers.arrayElement(['Orpi', 'Century 21', 'Laforêt', 'Guy Hoquet', 'Stéphane Plaza Immobilier']);
    const org = await prisma.organization.create({
      data: {
        tenantId: tenant.id,
        legalName: `${firstName} ${lastName} — Agent commercial`,
        legalForm: LegalForm.EI,
        siren: faker.string.numeric(9),
        siret: faker.string.numeric(14),
        naf: '6831Z',
        address: person.personalAddress as object,
        phone: person.phone,
        email,
        network: enseigne,
        brandName: `${enseigne} ${faker.location.city()}`,
        type: 'Client',
      },
    });

    // LegalLink (Person ↔ Organization en EI_SELF)
    await prisma.legalLink.create({
      data: {
        personId: person.id,
        organizationId: org.id,
        role: LinkRole.EI_SELF,
        function: 'Agent commercial immobilier',
        isPrimary: true,
        startDate: faker.date.past({ years: 3 }),
      },
    });

    // SessionParticipant (inscription à la session)
    await prisma.sessionParticipant.create({
      data: {
        sessionId: session.id,
        personId: person.id,
        sponsorOrgId: org.id,
        priceHT: 1800.0,
        amountCollected: 0.0,
        amountRemaining: 1800.0,
        enrollmentStatus: EnrollmentStatus.CONFIRMED,
        participantType: 'EI',
      },
    });

    apprenants.push({ person, org });
    console.log(`✓ apprenant ${i + 1}/3 = ${firstName} ${lastName} (${enseigne}) → ${person.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // RÉCAP
  // ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Seed terminé');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Tenant       : ${tenant.id}`);
  console.log(`Formateur    : ${trainer.id} (${trainer.firstName} ${trainer.lastName})`);
  console.log(`Produit      : ${product.id} (${product.code})`);
  console.log(`Session      : ${session.id} (${session.code})`);
  console.log('Apprenants   :');
  apprenants.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.person.firstName} ${a.person.lastName} (id=${a.person.id})`);
  });
  console.log('\n➡  Ouvre la session dans l\'UI :');
  console.log(`   http://localhost:3000/app/sessions/${session.id}`);
  console.log('\n➡  Génère le pack Qualiopi depuis cette page (bouton "Générer pack").');
}

main()
  .catch((e) => {
    console.error('❌ seed-test-session failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
