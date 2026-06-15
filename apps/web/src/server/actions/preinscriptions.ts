'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@qualiof/db';
import { validateRequest } from '@/lib/auth';
import { enqueueMail } from '@/lib/mailer-queue/enqueue';
import { loadOfConfig } from '@/lib/of-config';
import { renderPreinscriptionLinkEmail } from '@/lib/mailer-templates/preinscription-link';
import { childLogger } from '@/lib/logger';

const DEFAULT_VALIDITY_DAYS = 30;
const log = childLogger('preinscriptions.action');

export type CreatePreEnrollmentLinkResult =
  | {
      ok: true;
      url: string;
      token: string;
      preEnrollmentId: string;
      emailSent: boolean;
      emailDryRun: boolean;
    }
  | { ok: false; error: string };

export async function createPreEnrollmentLink(input: {
  email?: string;
  firstName?: string;
  lastName?: string;
  intendedSessionId?: string;
  validityDays?: number;
}): Promise<CreatePreEnrollmentLinkResult> {
  // ════════════════════════════════════════════════════════════════
  // Diagnostic logging (16-06-2026) — l'action retournait { ok:false }
  // côté client sans aucune trace dans les logs Vercel. Cause possible :
  // les logs Pino structurés JSON arrivent parfois en retard ou sont
  // filtrés par le moteur d'agrégation Vercel après return de la function.
  // On double désormais chaque log critique avec un console.error/log
  // (stderr/stdout direct) qui apparaît toujours dans les Logs Vercel.
  // ════════════════════════════════════════════════════════════════
  console.log(
    '[PREINSCRIPTION_LINK] start',
    JSON.stringify({ hasEmail: !!input.email, hasFirstName: !!input.firstName }),
  );

  // Wrap intégral try/catch : aucune exception ne doit remonter au client.
  // Un throw dans une server action est silencieusement avalé par useTransition
  // côté React → l'UI semble "ne rien faire". Toutes les erreurs deviennent un
  // { ok: false, error } qui est affichable côté client.
  try {
    const { user } = await validateRequest();
    if (!user) {
      console.warn('[PREINSCRIPTION_LINK] unauthenticated');
      return { ok: false, error: 'Non authentifié.' };
    }
    console.log(
      '[PREINSCRIPTION_LINK] auth ok',
      JSON.stringify({ userId: user.id, tenantId: user.tenantId }),
    );

    const token = randomUUID().replace(/-/g, '');
    const validity = input.validityDays ?? DEFAULT_VALIDITY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validity);

    console.log('[PREINSCRIPTION_LINK] before prisma.create');
    const created = await prisma.preEnrollment.create({
      data: {
        tenantId: user.tenantId,
        token,
        expiresAt,
        sentByUserId: user.id,
        sentTo: input.email?.trim() || null,
        sentAt: input.email?.trim() ? new Date() : null,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        email: input.email?.trim() || null,
        intendedSessionId: input.intendedSessionId || null,
        status: 'PENDING_FORM',
      },
    });
    console.log(
      '[PREINSCRIPTION_LINK] prisma.create ok',
      JSON.stringify({ id: created.id, token: token.slice(0, 8) + '…' }),
    );

    // URL absolue calculée côté serveur. Préfère NEXT_PUBLIC_APP_URL puis APP_URL.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/preinscription/${token}`;

    // Envoi email auto si un email a été fourni. Best-effort : si SMTP échoue,
    // on retourne quand même ok:true avec emailSent:false pour que Laurent
    // copie/colle le lien manuellement en fallback.
    let emailSent = false;
    let emailDryRun = false;
    if (input.email?.trim()) {
      try {
        const of = await loadOfConfig(user.tenantId);
        const { subject, html, text } = renderPreinscriptionLinkEmail(
          {
            firstName: input.firstName?.trim() ?? null,
            lastName: input.lastName?.trim() ?? null,
            formUrl: url,
            expiresAt,
          },
          of,
        );
        // Sprint 3 — Queue mailer pour ne pas bloquer l'action sur l'envoi SMTP.
        // Idempotency key par token : empêche un double-clic de générer 2 mails.
        const r = await enqueueMail({
          to: input.email.trim(),
          subject,
          html,
          text,
          idempotencyKey: `preinscription-link:${token}`,
        });
        emailSent = r.ok && r.mode !== 'dry-run';
        emailDryRun = r.mode === 'dry-run';
      } catch (e) {
        log.warn(
          { err: { message: (e as Error).message }, token },
          'preinscription.enqueueMail.failed',
        );
      }
    }

    revalidatePath('/app/inscriptions');
    return {
      ok: true,
      url,
      token,
      preEnrollmentId: created.id,
      emailSent,
      emailDryRun,
    };
  } catch (e) {
    const err = e as Error;
    const msg = err.message ?? 'Erreur technique';
    // Triple logging pour garantir une trace dans Vercel logs :
    //  - log.error (Pino JSON structuré, idéal pour grep/agrégation)
    //  - console.error (stderr direct, capturé inconditionnellement)
    //  - inclusion du code Prisma si dispo (P1001/P2002/etc.)
    const prismaCode = (e as { code?: string }).code;
    log.error(
      {
        err: { message: msg, stack: err.stack, code: prismaCode, name: err.name },
        input: { hasEmail: !!input.email, hasFirstName: !!input.firstName },
      },
      'preinscription.createLink.failed',
    );
    console.error(
      '[PREINSCRIPTION_LINK] FAILED',
      JSON.stringify({
        message: msg,
        name: err.name,
        prismaCode,
        stack: err.stack?.split('\n').slice(0, 5).join(' | '),
      }),
    );
    // Message générique côté client (sécurité — ne pas leak stack/path internes).
    // On inclut le `code` Prisma (P10xx, P20xx) pour aider au support si besoin.
    return {
      ok: false,
      error: prismaCode
        ? `Erreur base de données (${prismaCode}). Réessaie ou contacte le support.`
        : 'Erreur lors de la création du lien de pré-inscription. Réessaie ou contacte le support.',
    };
  }
}

export async function deletePreEnrollment(id: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await validateRequest();
  if (!user) return { ok: false, error: 'Non authentifié' };
  const pe = await prisma.preEnrollment.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!pe) return { ok: false, error: 'Pré-inscription introuvable' };
  // On ne peut pas supprimer si déjà convertie en apprenant
  if (pe.status === 'CONVERTED') {
    return { ok: false, error: 'Pré-inscription déjà convertie en apprenant — impossible à supprimer' };
  }
  await prisma.preEnrollment.delete({ where: { id } });
  revalidatePath('/app/inscriptions');
  return { ok: true };
}
