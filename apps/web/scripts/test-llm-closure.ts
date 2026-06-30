/**
 * Test du modèle LLM closure sur un prompt analyse-besoin réel.
 * À utiliser après un changement de OPENROUTER_MODEL_CLOSURE pour vérifier
 * que le modèle répond + rend du JSON conforme au schéma Zod.
 *
 * Usage :
 *   pnpm exec dotenv -e ../../.env -- tsx scripts/test-llm-closure.ts
 */

import { generateAnalyseBesoinContent } from '../src/lib/closure/ollama-generators';
import { getLlmModel } from '../src/lib/ai-config';

async function main() {
  const model = getLlmModel('closure');
  console.log(`→ Modèle effectif : ${model}\n`);

  const formation = {
    titre: 'ChatGPT pour la prospection immobilière',
    programmeMd: 'Jour 1 : Découverte\nJour 2 : Pratique\nJour 3 : Mise en situation',
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

  const t0 = Date.now();
  const r = await generateAnalyseBesoinContent(formation, stagiaire, 'PedagogicalAsset', null, null);
  const latency = Date.now() - t0;

  if (!r) {
    console.error('✗ Génération échouée (null) — voir warnings au-dessus.');
    process.exit(1);
  }

  console.log(`✓ Génération réussie en ${latency} ms\n`);
  console.log('contexte_professionnel :');
  console.log('  ' + (r.contexte_professionnel?.slice(0, 200) ?? '(vide)'));
  console.log(`\nobjectifs_stagiaire (${r.objectifs_stagiaire?.length ?? 0} items) :`);
  for (const o of (r.objectifs_stagiaire ?? []).slice(0, 3)) console.log(`  - ${o}`);
  console.log(`\ncompetences_visees (${r.competences_visees?.length ?? 0} items) :`);
  for (const c of (r.competences_visees ?? []).slice(0, 3)) console.log(`  - ${c}`);
  console.log(`\nmotivation :`);
  console.log('  ' + (r.motivation?.slice(0, 200) ?? '(vide)'));

  // Heuristique anti-stub : si "Florestan" apparaît, c'est personnalisé.
  const fullJson = JSON.stringify(r);
  const isPersonalized = fullJson.includes('Florestan') || fullJson.includes('immobil');
  console.log(`\n${isPersonalized ? '✓' : '⚠'} Contenu ${isPersonalized ? 'personnalisé (IA réelle)' : 'générique (stub probable)'}`);
}

main()
  .catch((e) => {
    console.error('✗', e?.message ?? e);
    process.exit(1);
  });
