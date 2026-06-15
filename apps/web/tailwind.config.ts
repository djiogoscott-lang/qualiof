import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Palette Slate/Indigo SaaS (adoptée 2026-06-15, remplace Start Academy navy).
        // Indigo Tailwind 600 (#4F46E5) avec ses voisins pour les nuances.
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Fond app = slate-50 Tailwind, foreground = slate-900.
        background: '#F8FAFC',
        foreground: '#0F172A',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Ombres "Premium SaaS" teintées indigo (Slate/Indigo theme depuis 2026-06-15).
        // Stripe/Linear/Vercel-like.
        'soft': '0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 8px -1px rgba(15, 23, 42, 0.08)',
        'card': '0 4px 16px -4px rgba(79, 70, 229, 0.10), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 12px 32px -8px rgba(79, 70, 229, 0.18), 0 4px 12px -4px rgba(15, 23, 42, 0.08)',
        'elevated': '0 20px 50px -12px rgba(79, 70, 229, 0.22), 0 8px 24px -6px rgba(15, 23, 42, 0.10)',
        'glow': '0 0 0 1px rgba(79, 70, 229, 0.08), 0 8px 24px -4px rgba(79, 70, 229, 0.16)',
      },
    },
  },
  plugins: [animate],
};

export default config;
