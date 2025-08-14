import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a',
          foreground: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#00b894',
          foreground: '#061a14',
        },
        card: {
          DEFAULT: '#0b1220',
          foreground: '#cbd5e1',
        },
        muted: {
          DEFAULT: '#0a0f1a',
          foreground: '#94a3b8',
        },
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.25)'
      }
    },
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config


