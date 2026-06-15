// Client Prisma partagé entre apps/web, apps/workers et tout consommateur du repo.
// Pattern singleton + LAZY init pour éviter d'épuiser les connexions Postgres en dev
// (HMR Next.js) ET pour éviter le crash "PrismaClient running in 'unknown'" quand
// le module est tiré dans un bundle client par transitivité (transpilePackages).
//
// LAZY INIT : on n'instancie PAS `new PrismaClient()` au chargement du module.
// On retourne un Proxy qui crée le client UNIQUEMENT au premier accès (`prisma.user...`).
// Conséquence : importer `prisma` depuis un composant client ne crash plus, tant que
// le client ne TENTE pas d'appeler une méthode (ce qu'il ne fera jamais en pratique
// puisque les vraies queries sont dans les Server Actions / Server Components).

import { PrismaClient } from '@prisma/client';
import { withTenantValidator } from './tenant-validator';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUnsafe?: PrismaClient;
};

let _prismaUnsafeReal: PrismaClient | undefined;
let _prismaReal: PrismaClient | undefined;

function getPrismaUnsafe(): PrismaClient {
  if (_prismaUnsafeReal) return _prismaUnsafeReal;
  if (globalForPrisma.prismaUnsafe) {
    _prismaUnsafeReal = globalForPrisma.prismaUnsafe;
    return _prismaUnsafeReal;
  }
  _prismaUnsafeReal = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaUnsafe = _prismaUnsafeReal;
  }
  return _prismaUnsafeReal;
}

function getPrisma(): PrismaClient {
  if (_prismaReal) return _prismaReal;
  if (globalForPrisma.prisma) {
    _prismaReal = globalForPrisma.prisma;
    return _prismaReal;
  }
  _prismaReal = withTenantValidator(getPrismaUnsafe()) as unknown as PrismaClient;
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _prismaReal;
  }
  return _prismaReal;
}

/**
 * Client Prisma "brut" — sans le validator multi-tenant.
 *
 * Réservé aux scripts de migration data, seeds et opérations
 * administratives qui doivent volontairement traverser les tenants
 * (ex: backfill global, audit cross-tenant). Ne PAS utiliser dans
 * les Server Actions / Routes / Workers métier.
 */
export const prismaUnsafe = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return Reflect.get(getPrismaUnsafe() as unknown as object, prop);
  },
  has(_t, prop) {
    return Reflect.has(getPrismaUnsafe() as unknown as object, prop);
  },
});

/**
 * Client Prisma "métier" — protégé par le validator multi-tenant.
 *
 * Sprint 4 : toute opération sur un modèle multi-tenant sans `tenantId`
 * dans son `where`/`data` est loggée en warn (ou refusée en mode strict
 * via `TENANT_VALIDATOR_MODE=strict`). C'est notre filet de sécurité
 * contre les fuites cross-tenant si un dev oublie le scoping.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return Reflect.get(getPrisma() as unknown as object, prop);
  },
  has(_t, prop) {
    return Reflect.has(getPrisma() as unknown as object, prop);
  },
});

// Re-export types Prisma pour consommation en aval
export * from '@prisma/client';

// Sprint 1 — Sécurité : helpers chiffrement at-rest (pgcrypto).
// Voir crypto.ts pour les détails.
export {
  encryptSensitive,
  decryptSensitive,
  decryptSensitiveBatch,
  isEncrypted,
} from './crypto';

// Sprint 4 — Robustesse : validator tenant-scoping.
export {
  withTenantValidator,
  MULTI_TENANT_MODELS,
  TENANT_VALIDATOR_EXEMPT,
} from './tenant-validator';
