import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Every scale resolves through CSS variables (see globals.css) so the
        // whole palette re-hues per role: crimson for Gaurav, amber for Ishita.
        // Values are space-separated RGB channels to keep /alpha modifiers working.
        ink: {
          0:   'rgb(var(--ink-0) / <alpha-value>)',
          50:  'rgb(var(--ink-50) / <alpha-value>)',
          100: 'rgb(var(--ink-100) / <alpha-value>)',
          200: 'rgb(var(--ink-200) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
        fog: {
          100: 'rgb(var(--fog-100) / <alpha-value>)',
          200: 'rgb(var(--fog-200) / <alpha-value>)',
          300: 'rgb(var(--fog-300) / <alpha-value>)',
          400: 'rgb(var(--fog-400) / <alpha-value>)',
          500: 'rgb(var(--fog-500) / <alpha-value>)',
        },
        // `crimson` stays the token name across the codebase — it means
        // "the accent voice", and the active role decides which hue that is.
        crimson: {
          DEFAULT: 'rgb(var(--accent-400) / <alpha-value>)',
          50:  'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
        },
        // Error state — visually distinct from the accent CTA
        error: {
          DEFAULT:   'rgb(var(--error) / <alpha-value>)',
          border:    'rgb(var(--error-border) / <alpha-value>)',
          text:      'rgb(var(--error-text) / <alpha-value>)',
        },
        // Season accents — used only for the season switch and season badges.
        season: {
          summer:  'rgb(var(--season-summer) / <alpha-value>)',
          monsoon: 'rgb(var(--season-monsoon) / <alpha-value>)',
          autumn:  'rgb(var(--season-autumn) / <alpha-value>)',
          winter:  'rgb(var(--season-winter) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['SamsungOne', '"SF Pro Display"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // One UI 9 bold refresh: hero weight up one step
        'oneui-hero':  ['32px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'oneui-title': ['26px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'oneui-h':     ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'oneui-body':  ['15px', { lineHeight: '21px', fontWeight: '400' }],
        'oneui-cap':   ['12px', { lineHeight: '17px', fontWeight: '500' }],
        'oneui-tab':   ['12px', { lineHeight: '15px', fontWeight: '600' }],
      },
      borderRadius: {
        'squircle-sm': '14px',
        'squircle':    '20px',
        'squircle-lg': '26px',
        'squircle-xl': '32px',
        // Sibling-app aliases: same values, the names WearWise Go uses. Keeps the
        // two design systems on one shared radius vocabulary so components copy cleanly.
        'oneui-sm':    '14px',
        'oneui':       '20px',
        'oneui-lg':    '26px',
        'oneui-xl':    '32px',
      },
      boxShadow: {
        'card':         '0 1px 0 rgba(255,255,255,0.04) inset',
        'crimson-glow': '0 0 20px rgb(var(--accent-400) / 0.4)',
        'oneui-raised': '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      },
      animation: {
        'oneui-pop':  'oneui-pop 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'oneui-fade': 'oneui-fade 220ms ease-out',
        'shelf-in':   'shelf-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'heart-in':   'heart-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
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
        'shelf-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'heart-in': {
          '0%':   { opacity: '0', transform: 'scale(0.6)' },
          '60%':  { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
