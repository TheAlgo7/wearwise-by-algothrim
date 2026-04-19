import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          0:   '#000000',
          50:  '#0A0A0C',
          100: '#121012',
          200: '#1A1819',
          300: '#1C1A1D',
          400: '#252225',
          500: '#2F2C30',
          600: '#3A363B',
        },
        fog: {
          100: '#F5EEF0',
          200: '#D9C8CC',
          300: '#A89098',
          400: '#7A6870',
          500: '#4A3A40',
        },
        crimson: {
          DEFAULT: '#E2335D',
          50:  '#FFEDE8',
          100: '#FFD9DA',
          200: '#FFDAC7',
          300: '#FF86A0',
          400: '#E2335D',
          500: '#BB165F',
          600: '#8B0F47',
          700: '#5E0A31',
        },
      },
      fontFamily: {
        sans: ['SamsungOne', '"SF Pro Display"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'oneui-hero':  ['32px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'oneui-title': ['26px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'oneui-h':     ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'oneui-body':  ['15px', { lineHeight: '21px', fontWeight: '400' }],
        'oneui-cap':   ['12px', { lineHeight: '17px', fontWeight: '500' }],
        'oneui-tab':   ['11px', { lineHeight: '14px', fontWeight: '600' }],
      },
      borderRadius: {
        'squircle-sm': '14px',
        'squircle':    '20px',
        'squircle-lg': '26px',
        'squircle-xl': '32px',
      },
      boxShadow: {
        'card': '0 1px 0 rgba(255,255,255,0.04) inset',
      },
      backgroundImage: {
        'crimson-gradient': 'linear-gradient(135deg, #E2335D 0%, #BB165F 100%)',
      },
      animation: {
        'oneui-pop':  'oneui-pop 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'oneui-fade': 'oneui-fade 220ms ease-out',
      },
      keyframes: {
        'oneui-pop': {
          '0%':   { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'oneui-fade': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
