/**
 * Helper unifié pour envoyer un mail — privilégie la queue, retombe sur
 * l'envoi inline si Redis est down.
 *
 * Usage cible côté Server Actions / Workers :
 *
 *   await enqueueMail({
 *     to: 'alice@example.com',
 *     subject: '…',
 *     html: '…',
 *     text: '…',
 *     idempotencyKey: `lead-assigned-${leadId}-${assigneeId}`,
 *
 * ⚠ Le jobId BullMQ interdit le caractère `:` ; utiliser `-` comme séparateur.
 *   });
 *
 * Retour :
 *   - `{ ok: true, mode: 'queued', jobId }` si push en queue réussi
 *   - `{ ok: true, mode: 'inline' }` si fallback inline avec succès
 *   - `{ ok: true, mode: 'dry-run' }` si SMTP non configuré (mode dev)
 *   - `{ ok: false, error }` si même l'inline a échoué
 *
 * Note : on logge automatiquement le contexte (requestId, userId) via le
 * AsyncLocalStorage du logger.
 */

import { prisma } from '@qualiof/db';
import { sendMail, type SendMailInput } from '../mailer';
import { childLogger, getContext } from '../logger';
import { enqueueMailerJob, type MailerJobPayload } from './queue';

const log = childLogger('mailer-enqueue');

export interface EnqueueMailResult {
  ok: boolean;
  mode?: 'queued' | 'inline' | 'dry-run';
  jobId?: string;
  error?: string;
}

export interface EnqueueMailInput extends SendMailInput {
  idempotencyKey?: string;
  /**
   * Permet au caller d'override le tenantId pour la persistance EmailMessage.
   * Si omis, lecture via `getContext()` (AsyncLocalStorage). Si absent dans les
   * deux : pas de persistance (cas worker BullMQ sans `runWithContext`).
   */
  tenantId?: string;
  /** Identifiant template (clé du EmailTemplate Prisma). Persistance audit uniquement. */
  templateId?: string;
  /** Entité métier liée (ex: 'lead:xxx', 'invoice:yyy'). Persistance audit uniquement. */
  relatedEntity?: string;
}

/**
 * Persiste un EmailMessage pour l'historique des conversations ADMIN.
 * Tolérant aux erreurs : un échec de persist ne casse jamais l'envoi.
 */
async function persistEmailMessage(
  tenantId: string,
  input: EnqueueMailInput,
  status: 'queued' | 'sent' | 'dry-run' | 'bounced',
): Promise<void> {
  try {
    const toEmails: string[] = [input.to];
    await prisma.emailMessage.create({
      data: {
        tenantId,
        templateId: input.templateId ?? null,
        fromEmail: process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? 'noreply@startacademy.fr',
        toEmails: toEmails as unknown as object,
        subject: input.subject,
        bodyHtml: input.html ?? input.text ?? '',
        status,
        sentAt: status === 'sent' || status === 'dry-run' ? new Date() : null,
        relatedEntity: input.relatedEntity ?? null,
      },
    });
  } catch (err) {
    log.warn(
      { err: { message: (err as Error).message } },
      'mail.history.persist.failed',
    );
  }
}

export async function enqueueMail(input: EnqueueMailInput): Promise<EnqueueMailResult> {
  const ctx = getContext();
  const tenantId = input.tenantId ?? ctx?.tenantId;
  const payload: MailerJobPayload = {
    ...input,
    context: ctx
      ? {
          requestId: ctx.requestId,
          userId: ctx.userId,
          tenantId: ctx.tenantId,
        }
      : undefined,
  };

  try {
    await enqueueMailerJob(payload);
    log.info(
      { to: input.to, idempotencyKey: input.idempotencyKey },
      'mail.queued',
    );
    if (tenantId) await persistEmailMessage(tenantId, input, 'queued');
    return { ok: true, mode: 'queued', jobId: input.idempotencyKey };
  } catch (queueErr) {
    log.warn(
      {
        to: input.to,
        err: { message: (queueErr as Error).message },
      },
      'mail.queue.failed.fallback-inline',
    );
    const r = await sendMail(input);
    if (r.ok) {
      const status = r.dryRun ? 'dry-run' : 'sent';
      if (tenantId) await persistEmailMessage(tenantId, input, status);
      return { ok: true, mode: r.dryRun ? 'dry-run' : 'inline' };
    }
    if (tenantId) await persistEmailMessage(tenantId, input, 'bounced');
    return { ok: false, error: r.error ?? 'Échec envoi mail' };
  }
}
