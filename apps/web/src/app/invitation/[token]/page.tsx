/**
 * Phase 8 RBAC-02 — Page publique `/invitation/[token]`.
 *
 * Server Component force-dynamic (jamais cache, lecture token fraîche à chaque requête).
 * Pattern miroir `/preinscription/[token]/page.tsx` : Server Component qui lit la
 * BDD, calcule 3 états (expired / used / fresh) et délègue le rendu :
 *   - notFound() si le token n'existe pas du tout
 *   - <ExpiredState />     si invitation.expiresAt < now()
 *   - <AlreadyUsedState /> si invitation.usedAt != null
 *   - <SetPasswordForm />  sinon (case nominale)
 *
 * Sécurité : aucune vérif `validateRequest()` — la route est publique, le token
 * EST l'authentification. L'action `acceptInvitation` re-valide atomiquement.
 *
 * Brand cohérente avec `/preinscription/[token]` : header "S" + footer Qualiopi/RGPD.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { prisma } from '@qualiof/db';
import { SetPasswordForm } from '@/components/users/set-password-form';

export const dynamic = 'force-dynamic';

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      email: true,
      role: true,
      expiresAt: true,
      usedAt: true,
      userId: true,
      user: { select: { firstName: true } },
    },
  });

  if (!invitation) notFound();

  const expired = invitation.expiresAt < new Date();
  const used = invitation.usedAt != null;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-white font-bold inline-flex items-center justify-center">
            S
          </div>
          <div>
            <div className="font-semibold text-slate-100">QualiOF — Start Academy</div>
            <div className="text-xs text-slate-400">Activation de votre compte</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {expired ? (
          <ExpiredState />
        ) : used ? (
          <AlreadyUsedState />
        ) : (
          <SetPasswordForm
            token={invitation.token}
            email={invitation.email}
            firstName={invitation.user?.firstName ?? null}
            role={invitation.role}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-5 mt-10">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Données stockées en France · Qualiopi · RGPD
          </div>
          <div>© Start Academy {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl shadow-lg p-12 text-center space-y-4">
      <Clock className="h-12 w-12 text-red-400 mx-auto" />
      <h1 className="text-xl font-bold text-slate-100">Ce lien a expiré</h1>
      <p className="text-sm text-slate-300 max-w-md mx-auto">
        Le lien d'invitation n'est plus valable (les liens expirent après 7 jours).
        Contactez votre administrateur pour recevoir un nouveau lien.
      </p>
    </div>
  );
}

function AlreadyUsedState() {
  return (
    <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl shadow-lg p-12 text-center space-y-4">
      <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
      <h1 className="text-xl font-bold text-slate-100">Invitation déjà acceptée</h1>
      <p className="text-sm text-slate-300 max-w-md mx-auto">
        Vous avez déjà défini votre mot de passe via ce lien. Connectez-vous normalement
        avec votre email et le mot de passe que vous aviez choisi.
      </p>
      <Link
        href="/login"
        className="inline-block text-sm font-medium text-indigo-400 underline"
      >
        Aller à la page de connexion
      </Link>
    </div>
  );
}
