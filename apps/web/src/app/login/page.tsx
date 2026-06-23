import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const { user } = await validateRequest();
  if (user) redirect('/app');
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      {/* Décor : 2 blobs gradient floutés en arrière-plan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/15 to-indigo-500/20 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        {/* Carte de connexion — dark slate solide (audit 2026-06-23) */}
        <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-xl font-bold shadow-lg ring-1 ring-white/20">
              Q
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">QualiOF</h1>
              <p className="text-sm text-slate-300 mt-1">Connectez-vous pour accéder à votre espace</p>
            </div>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Compte de démonstration : <code className="font-mono bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 shadow-sm">admin@startacademy.fr</code>{' '}
          / <code className="font-mono bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 shadow-sm">admin</code>
        </p>
      </div>
    </div>
  );
}
