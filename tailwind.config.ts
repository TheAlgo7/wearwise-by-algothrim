import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // True black AMOLED base
        ink: {
          0:   '#000000',
          50:  '#0A0A0C',
          100: '#101014',
          200: '#16161B',
          300: '#1C1C22',
          400: '#24242C',
          500: '#2F2F39',
          600: '#3A3A46',
        },
        // Neutral text grays (warm-shifted for the new palette)
        fog: {
          100: '#F5EEF0',
          200: '#D9C8CC',
          300: '#A890978',
          400: '#7A6870',
          500: '#4A3A40',
        },
        // WearWise Pink/Red accent system
        crimson: {
          DEFAULT: '#E2335D',
          50:  '#FFEDE8',  // pale peach — hero text tint
          100: '#FFD9DA',  // surface highlight 1
          200: '#FFDAC7',  // surface highlight 2
          300: '#FF86A0',  // soft glow / secondary
          400: '#E2335D',  // primary accent
          500: '#BB165F',  // deep accent / active
          600: '#8B0F47',
          700: '#5E0A31',
          glow: 'rgba(226,51,93,0.45)',
        },
      },
      fontFamily: {
        sans: [
          'SamsungOne',
          '"SF Pro Display"',
          'system-ui',
          '-apple-system',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        'oneui-hero':   ['40px',  { lineHeight: '46px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'oneui-title':  ['28px',  { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'oneui-h':      ['22px',  { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'oneui-body':   ['16px',  { lineHeight: '22px', fontWeight: '400' }],
        'oneui-cap':    ['13px',  { lineHeight: '18px', fontWeight: '500' }],
        'oneui-tab':    ['11px',  { lineHeight: '14px', fontWeight: '600' }],
      },
      borderRadius: {
        'squircle-sm': '16px',
        'squircle':    '24px',
        'squircle-lg': '32px',
        'squircle-xl': '40px',
      },
      boxShadow: {
        'crimson-glow': '0 0 28px 0 rgba(226,51,93,0.45)',
        'glass-card':   '0 8px 32px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.07) inset',
        'oneui-card':   '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)',
        'oneui-raised': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.6)',
        'nav-pill':     '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
      },
      backgroundImage: {
        'crimson-gradient': 'linear-gradient(135deg, #E2335D 0%, #BB165F 100%)',
        'crimson-gradient-soft': 'linear-gradient(135deg, #E2335D80 0%, #BB165F80 100%)',
        'ambient-bg':       'radial-gradient(ellipse 80% 60% at 30% 10%, #2d0515 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, #1a050c 0%, transparent 55%)',
      },
      animation: {
        'oneui-pop':      'oneui-pop 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'oneui-fade':     'oneui-fade 260ms ease-out',
        'pulse-crimson':  'pulse-crimson 2.2s ease-in-out infinite',
        'shimmer':        'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'oneui-pop': {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'oneui-fade': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-crimson': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(226,51,93,0.5)' },
          '50%':     { boxShadow: '0 0 0 16px rgba(226,51,93,0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
