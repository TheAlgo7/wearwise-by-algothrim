import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // True black AMOLED stack
        ink: {
          0:   '#000000', // page background
          50:  '#0A0A0C',
          100: '#101014',
          200: '#16161B',
          300: '#1C1C22',
          400: '#24242C',
          500: '#2F2F39',
          600: '#3A3A46',
        },
        // One UI neutrals (text + borders)
        fog: {
          100: '#F5F5F7',
          200: '#D9D9DF',
          300: '#A8A8B3',
          400: '#6E6E78',
          500: '#4A4A52',
        },
        // Crimson Nitro accent
        crimson: {
          DEFAULT: '#FF1744',
          50:  '#FFE5EB',
          100: '#FFB8C4',
          200: '#FF8099',
          300: '#FF4D72',
          400: '#FF1744',
          500: '#E60034',
          600: '#BF002C',
          700: '#990023',
          glow: 'rgba(255,23,68,0.35)',
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
        display: [
          'SamsungSharpSans',
          '"SF Pro Display"',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        'oneui-hero':   ['38px',  { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'oneui-title':  ['28px',  { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'oneui-h':      ['22px',  { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'oneui-body':   ['16px',  { lineHeight: '22px', fontWeight: '400' }],
        'oneui-cap':    ['13px',  { lineHeight: '18px', fontWeight: '500' }],
        'oneui-tab':    ['11px',  { lineHeight: '14px', fontWeight: '600' }],
      },
      borderRadius: {
        // One UI squircle radii
        'squircle-sm': '14px',
        'squircle':    '22px',
        'squircle-lg': '28px',
        'squircle-xl': '36px',
      },
      boxShadow: {
        'crimson-glow': '0 0 24px 0 rgba(255,23,68,0.35)',
        'oneui-card':   '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)',
        'oneui-raised': '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'crimson-gradient': 'linear-gradient(135deg, #FF1744 0%, #DC143C 60%, #990023 100%)',
        'ink-gradient':     'linear-gradient(180deg, #0A0A0C 0%, #000000 100%)',
      },
      animation: {
        'oneui-pop':  'oneui-pop 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'oneui-fade': 'oneui-fade 240ms ease-out',
        'pulse-crimson': 'pulse-crimson 2s ease-in-out infinite',
      },
      keyframes: {
        'oneui-pop': {
          '0%':   { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'oneui-fade': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-crimson': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,23,68,0.45)' },
          '50%':     { boxShadow: '0 0 0 14px rgba(255,23,68,0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
