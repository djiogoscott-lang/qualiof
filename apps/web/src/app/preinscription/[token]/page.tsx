import { notFound } from 'next/navigation';
import { Sparkles, ShieldCheck, Clock } from 'lucide-react';
import { prisma } from '@qualiof/db';
import { PublicPreEnrollmentForm } from '@/components/preinscriptions/public-form';

export const dynamic = 'force-dynamic';

export default async function PublicPreEnrollmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const pe = await prisma.preEnrollment.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      status: true,
      expiresAt: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!pe) notFound();

  const expired = pe.expiresAt < new Date();
  const alreadyDone = pe.status === 'CONVERTED' || pe.status === 'VALIDATED';

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-white font-bold inline-flex items-center justify-center">
            S
          </div>
          <div>
            <div className="font-semibold text-slate-100">Start Academy</div>
            <div className="text-xs text-slate-400">Organisme de formation Qualiopi</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {expired ? (
          <ExpiredState />
        ) : alreadyDone ? (
          <AlreadyDoneState />
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-200 ring-1 ring-primary/30 text-xs font-medium mb-3">
                <Sparkles className="h-3 w-3" /> Pré-inscription en ligne
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
                Bienvenue {pe.firstName ? pe.firstName : ''} 👋
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
                Pour finaliser ton dossier de pré-inscription, dépose tes pièces justificatives
                et complète quelques informations. <strong className="text-slate-100">Ça ne te prendra que 2 minutes.</strong>
              </p>
            </div>

            <PublicPreEnrollmentForm
              token={pe.token}
              prefillFirstName={pe.firstName ?? undefined}
              prefillLastName={pe.lastName ?? undefined}
              prefillEmail={pe.email ?? undefined}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-5 mt-10">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Données stockées en France · Qualiopi · RGPD
          </div>
          <div>© Start Academy 2026</div>
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
        Le lien que tu as utilisé n'est plus valable. Contacte Start Academy pour
        recevoir un nouveau lien.
      </p>
      <a href="mailto:contact@start-academy.fr" className="inline-block text-sm font-medium text-indigo-400 underline">
        contact@start-academy.fr
      </a>
    </div>
  );
}

function AlreadyDoneState() {
  return (
    <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl shadow-lg p-12 text-center space-y-4">
      <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto" />
      <h1 className="text-xl font-bold text-slate-100">Dossier déjà traité</h1>
      <p className="text-sm text-slate-300 max-w-md mx-auto">
        Ton dossier a déjà été reçu et traité par Start Academy. Tu n'as rien d'autre à faire.
      </p>
    </div>
  );
}
