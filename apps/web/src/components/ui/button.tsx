import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Système de boutons partagé — Sortilège d'Halloween (dark mode mystic).
 *
 * Micro-interactions premium :
 *  - Fluidité : `transition-all duration-300 ease-out`
 *  - Tactile : `active:scale-[0.97]`
 *  - Élévation : `hover:-translate-y-0.5`
 *  - Glow : hover projette une lueur ambrée/violette/emerald/rouge selon variant.
 *
 * Variants :
 *  - `dark`     — surface sombre, hover halo violet subtil
 *  - `primary`  — CTA mystic violet→ambre au hover (cf .btn-mystic)
 *  - `outline`  — glass-panel + bordure ambrée au hover
 *  - `ghost`    — sans fond, hover halo ambré
 *  - `success`  — gradient emerald + glow vert
 *  - `danger`   — gradient red + glow rouge
 *  - `link`     — ancre primary, souligné
 */

export type ButtonVariant =
  | 'dark'
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'link';

export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

const BASE = [
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
  'font-medium select-none',
  // Fluidité totale : courbe douce qui finit lentement → sensation premium
  'transition-all duration-300 ease-out',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
  // Tactile : le bouton s'enfonce physiquement au clic
  'active:scale-[0.97]',
  // Disabled : neutralise toutes les micro-interactions
  'disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
].join(' ');

const VARIANTS: Record<ButtonVariant, string> = {
  // Dark — surface sombre glass, halo violet discret au hover
  dark: [
    'bg-white/[0.06] text-zinc-100 border border-white/10 backdrop-blur-md shadow-soft',
    'hover:bg-white/[0.10] hover:border-primary/30 hover:-translate-y-0.5',
    'hover:shadow-[0_8px_24px_-4px_rgba(168,85,247,0.35),0_0_20px_rgba(168,85,247,0.20)]',
    'focus-visible:ring-primary/40',
  ].join(' '),
  // Primary — gradient violet, glow ambré au hover (signature Halloween).
  primary: [
    'text-white shadow-mystic',
    'bg-gradient-to-br from-primary via-primary-700 to-primary-900',
    'hover:-translate-y-0.5',
    'hover:shadow-[0_8px_28px_-4px_rgba(245,158,11,0.55),0_0_30px_-2px_rgba(245,158,11,0.45),0_4px_16px_-4px_rgba(168,85,247,0.45)]',
    'focus-visible:ring-primary/50',
  ].join(' '),
  // Outline — glass-panel + bordure ambrée au hover
  outline: [
    'bg-white/[0.03] text-zinc-200 border border-white/10 backdrop-blur-md shadow-soft',
    'hover:border-halloween-glow/45 hover:bg-halloween-glow/[0.06] hover:text-amber-200 hover:-translate-y-0.5',
    'hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.40)]',
    'focus-visible:ring-halloween-glow/40',
  ].join(' '),
  // Ghost — sans fond, halo ambré au hover
  ghost: [
    'bg-transparent text-zinc-300',
    'hover:bg-white/5 hover:text-halloween-glow',
    'hover:shadow-[0_0_18px_-4px_rgba(245,158,11,0.30)]',
    'focus-visible:ring-halloween-glow/40',
  ].join(' '),
  // Success — gradient emerald + glow vert
  success: [
    'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-soft',
    'hover:from-emerald-400 hover:to-emerald-600 hover:-translate-y-0.5',
    'hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.50),0_0_20px_rgba(16,185,129,0.30)]',
    'focus-visible:ring-emerald-300',
  ].join(' '),
  // Danger — gradient red + glow rouge
  danger: [
    'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-soft',
    'hover:from-red-400 hover:to-red-600 hover:-translate-y-0.5',
    'hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.50),0_0_20px_rgba(239,68,68,0.30)]',
    'focus-visible:ring-red-300',
  ].join(' '),
  // Link — ancre primary souligné (pas de transform)
  link: [
    'bg-transparent text-primary-200 underline-offset-4',
    'hover:underline hover:text-halloween-glow',
    'focus-visible:ring-primary/40 active:scale-100',
  ].join(' '),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs rounded-lg',
  default: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
};

export function buttonStyles({
  variant = 'dark',
  size = 'default',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'dark', size = 'default', className, children, type = 'button', ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonStyles({ variant, size, className })}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
