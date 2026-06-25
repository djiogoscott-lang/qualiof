/**
 * Route admin diagnostic — liste les derniers ClosureJob en ERROR avec
 * leur errorMessage. Sert à débugger les crashes du pack fin de formation
 * sans avoir à se connecter directement à la BDD prod.
 *
 * ⚠ SÉCURITÉ
 *   - Protégée par le même token que /api/admin/test-invoice (ADMIN_TEST_TOKEN)
 *   - Comparaison via timingSafeEqual
 *   - Lecture seule, aucune mutation
 *
 * 🎯 USAGE
 *   curl "https://<prod>/api/admin/closure-errors?token=<TOKEN>&limit=20"
 *   curl "https://<prod>/api/admin/closure-errors?token=<TOKEN>&kind=ANALYSE_BESOIN"
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@qualiof/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isTokenValid(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request): Promise<NextResponse> {
  const expected = process.env.ADMIN_TEST_TOKEN;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { ok: false, error: 'ADMIN_TEST_TOKEN non configuré (min 16 caractères).' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!isTokenValid(token, expected)) {
    return NextResponse.json({ ok: false, error: 'Token invalide' }, { status: 401 });
  }

  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const kind = url.searchParams.get('kind');

  const jobs = await prisma.closureJob.findMany({
    where: {
      status: 'ERROR',
      ...(kind ? { kind: kind as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      attempts: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      participantId: true,
      batch: {
        select: {
          id: true,
          sessionId: true,
        },
      },
    },
  });

  // Résout participants + sessions en lookups séparés (ClosureBatch n'a pas
  // de relation Prisma directe vers TrainingSession, et ClosureJob n'en a
  // pas vers SessionParticipant).
  const participantIds = Array.from(new Set(jobs.map((j) => j.participantId)));
  const sessionIds = Array.from(
    new Set(jobs.map((j) => j.batch?.sessionId).filter((s): s is string => Boolean(s))),
  );
  const [participants, sessions] = await Promise.all([
    participantIds.length
      ? prisma.sessionParticipant.findMany({
          where: { id: { in: participantIds } },
          select: {
            id: true,
            person: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.trainingSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, code: true },
        })
      : Promise.resolve([]),
  ]);
  const participantById = new Map(
    participants.map((p) => [p.id, `${p.person.firstName} ${p.person.lastName}`]),
  );
  const sessionCodeById = new Map(sessions.map((s) => [s.id, s.code]));

  // Compte global par kind pour repérer si c'est ANALYSE_BESOIN spécifique
  // ou si tout passe en ERROR (= service tiers down).
  const countsByKind = await prisma.closureJob.groupBy({
    by: ['kind'],
    where: { status: 'ERROR' },
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
    total: jobs.length,
    countsByKind: countsByKind.map((c) => ({ kind: c.kind, count: c._count._all })),
    jobs: jobs.map((j) => ({
      id: j.id,
      kind: j.kind,
      attempts: j.attempts,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      batchId: j.batch?.id,
      sessionCode: j.batch?.sessionId ? sessionCodeById.get(j.batch.sessionId) ?? null : null,
      participant: participantById.get(j.participantId) ?? null,
    })),
  });
}
