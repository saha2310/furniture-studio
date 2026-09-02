import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F4EF',
        surface: '#ECE6DC',
        ink: '#2A2521',
        walnut: '#8B5E3C',
        walnutDark: '#6E4A2E',
        stone: '#C9BFAF',
        espresso: '#4A4038',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      maxWidth: {
        prose: '68ch',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
