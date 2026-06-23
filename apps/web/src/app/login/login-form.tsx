'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@qualiof/shared';
import { loginAction } from './actions';

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginInput) => {
    setError(null);
    startTransition(async () => {
      const res = await loginAction(data);
      if (!res.ok) setError(res.error);
    });
  };

  // Style partagé pour les inputs — dark slate solide (audit 2026-06-23).
  const inputClass =
    'w-full h-11 px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition-all duration-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-slate-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          {...register('email')}
          className={inputClass}
          placeholder="vous@startacademy.fr"
        />
        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium text-slate-300">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className={inputClass}
          placeholder="••••••••"
        />
        {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/40 ring-1 ring-red-500/40 p-3 text-sm text-red-200 flex items-start gap-2.5 shadow-sm">
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="
          w-full h-11 rounded-xl
          bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium text-sm shadow-soft
          transition-all duration-300 ease-out
          hover:from-indigo-700 hover:to-blue-700 hover:-translate-y-0.5
          hover:shadow-[0_8px_24px_-4px_rgba(79,70,229,0.45),0_0_20px_rgba(79,70,229,0.25)]
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-soft disabled:active:scale-100
        "
      >
        {isPending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
