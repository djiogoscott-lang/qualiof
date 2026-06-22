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
        primary: {
          DEFAULT: '#A855F7',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        background: '#050505',
        foreground: '#F4F4F5',
        muted: {
          DEFAULT: '#0F0F12',
          foreground: '#9CA3AF',
        },
        border: 'rgba(255,255,255,0.08)',
        halloween: {
          bg: '#050505',
          surface: '#0B0B10',
          surface2: '#13131A',
          primary: '#A855F7',
          'primary-hover': '#C084FC',
          glow: '#F59E0B',
          'glow-hot': '#FB923C',
          text: '#F4F4F5',
          'text-dim': '#9CA3AF',
        },
      },
      backgroundImage: {
        'glass-radial': 'radial-gradient(120% 80% at 0% 0%, rgba(168,85,247,0.10) 0%, rgba(245,158,11,0.04) 40%, rgba(0,0,0,0) 70%)',
        'mystic-gradient': 'linear-gradient(135deg, #A855F7 0%, #7E22CE 50%, #581C87 100%)',
        'ember-gradient': 'linear-gradient(135deg, #F59E0B 0%, #FB923C 50%, #C2410C 100%)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(0,0,0,0.40), 0 1px 8px -1px rgba(0,0,0,0.30)',
        'card': '0 4px 20px -6px rgba(168,85,247,0.18), 0 2px 8px -2px rgba(0,0,0,0.50)',
        'card-hover': '0 12px 40px -8px rgba(168,85,247,0.32), 0 4px 16px -4px rgba(0,0,0,0.60)',
        'elevated': '0 20px 60px -12px rgba(168,85,247,0.36), 0 8px 28px -6px rgba(0,0,0,0.70)',
        'glow': '0 0 0 1px rgba(168,85,247,0.16), 0 8px 32px -4px rgba(168,85,247,0.32)',
        'mystic': '0 0 0 1px rgba(168,85,247,0.20), 0 8px 28px -2px rgba(168,85,247,0.40), 0 0 60px -10px rgba(168,85,247,0.30)',
        'ember': '0 0 0 1px rgba(245,158,11,0.30), 0 8px 28px -2px rgba(245,158,11,0.45), 0 0 60px -10px rgba(245,158,11,0.35)',
      },
    },
  },
  plugins: [animate],
};

export default config;
