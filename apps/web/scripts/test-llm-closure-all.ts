/**
 * Test E2E des 7 generators IA closure avec le modèle effectif.
 * Sert à valider qu'aucun generator ne tombe en stub après changement de
 * OPENROUTER_MODEL_CLOSURE (ex : migration mistral-large-2411 → 2512).
 *
 * Pour chaque generator on tente l'appel LLM + parsing Zod, et on rapporte :
 *   - OK : JSON valide rendu, contenu personnalisé
 *   - KO : null (LLM down ou JSON invalide post-retry)
 *
 * Usage :
 *   pnpm exec dotenv -e ../../.env -- tsx scripts/test-llm-closure-all.ts
 */

import { getLlmModel } from '../src/lib/ai-config';
import {
  generateAnalyseBesoinContent,
  generateDerouleContent,
  generateGrilleContent,
  generateGrilleSessionContent,
  generatePositionnementContent,
  generateQcmContent,
  generateSatisfactionChaudContent,
  generateSatisfactionFroidContent,
} from '../src/lib/closure/ollama-generators';

const formation = {
  titre: 'ChatGPT pour la prospection immobilière',
  programmeMd: `Jour 1 — Découverte de l'IA générative
9h00–12h00 : Cadrage commercial et analyse du portefeuille client
13h30–17h00 : Premiers prompts ChatGPT

Jour 2 — Prospection IA
9h00–12h00 : Rédaction de messages personnalisés
13h30–17h00 : Atelier pratique

Jour 3 — Mise en pratique
9h00–12h00 : Cas concrets
13h30–17h00 : Bilan et plan d'action`,
  nombreHeures: 21,
};

const stagiaire = {
  prenom: 'Florestan',
  nom: 'VASSEUR',
  entreprise: 'VASSEUR Immobilier (EI)',
  fonction: 'Agent commercial immobilier indépendant',
  anciennete: '3 ans',
  diplomes: 'Bac+2 Immobilier',
  professionalStatus: 'Auto-entrepreneur',
};

interface TestCase {
  name: string;
  run: () => Promise<unknown | null>;
  inspect: (r: any) => string;
}

const cases: TestCase[] = [
  {
    name: 'ANALYSE_BESOIN',
    run: () => generateAnalyseBesoinContent(formation, stagiaire, 'PedagogicalAsset', null, null),
    inspect: (r) => `${r.objectifs_stagiaire?.length} objectifs, ${r.competences_visees?.length} compétences`,
  },
  {
    name: 'QCM',
    run: () => generateQcmContent(formation, 'PedagogicalAsset', null, null),
    inspect: (r) => `${r.questions?.length} questions`,
  },
  {
    name: 'GRILLE_OBS',
    run: () => generateGrilleContent(formation, stagiaire, 'PedagogicalAsset', null, null),
    inspect: (r) => `${r.competences?.length} compétences évaluées`,
  },
  {
    name: 'POSITIONNEMENT',
    run: () => generatePositionnementContent(formation, stagiaire, 'PedagogicalAsset', null, null),
    inspect: (r) => `${r.competences?.length} compétences avant/après`,
  },
  {
    name: 'SATISFACTION_CHAUD',
    run: () => generateSatisfactionChaudContent(formation, stagiaire, 'PedagogicalAsset', null, null),
    inspect: (r) => `reco=${r.recommandation}, ${Object.keys(r).length} sections`,
  },
  {
    name: 'SATISFACTION_FROID',
    run: () => generateSatisfactionFroidContent(formation, stagiaire, 'PedagogicalAsset', null, null),
    inspect: (r) => `reco=${r.bilan?.recommandation}, ${Object.keys(r).length} sections`,
  },
  {
    name: 'DEROULE',
    run: () => generateDerouleContent(formation, 'PedagogicalAsset', null, null),
    inspect: (r) => `${r.jours?.length} jours, ${r.jours?.[0]?.sequences?.length} seq./jour`,
  },
  {
    name: 'GRILLE_OBS_SESSION',
    run: () =>
      generateGrilleSessionContent(
        formation,
        [
          { participantId: 'p1', prenom: 'Florestan', nom: 'VASSEUR', fonction: 'Agent commercial', professionalStatus: 'AE' },
          { participantId: 'p2', prenom: 'Arsinoé', nom: 'BRUN', fonction: 'Agent commercial', professionalStatus: 'AE' },
        ],
        'Document',
        null,
        null,
      ),
    inspect: (r) => `${r.competences?.length} compétences, ${r.observations?.length} obs.`,
  },
];

async function main() {
  const model = getLlmModel('closure');
  console.log(`→ Modèle closure effectif : ${model}\n`);

  let ok = 0;
  let ko = 0;
  for (const c of cases) {
    process.stdout.write(`  · ${c.name.padEnd(22)} … `);
    const t0 = Date.now();
    let r: any;
    try {
      r = await c.run();
    } catch (e: any) {
      console.log(`✗ EXCEPTION ${e?.message ?? e}`);
      ko++;
      continue;
    }
    const latency = ((Date.now() - t0) / 1000).toFixed(1);
    if (r) {
      console.log(`✓ ${latency}s — ${c.inspect(r)}`);
      ok++;
    } else {
      console.log(`✗ ${latency}s — null (LLM KO ou JSON invalide après retries)`);
      ko++;
    }
  }

  console.log(`\n→ Résultat : ${ok} OK / ${ko} KO sur ${cases.length} generators`);
  if (ko > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('✗', e?.message ?? e);
    process.exit(1);
  });
