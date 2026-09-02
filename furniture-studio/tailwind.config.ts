import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#151514',
        surface: '#1d1d1b',
        ink: '#e8e1d8',
        walnut: '#c8bfb5',
        walnutDark: '#f0eae2',
        stone: '#8a847d',
        espresso: '#c2bbb3',
      },
      fontFamily: {
        display: ['var(--font-sans)'],
        sans: ['var(--font-sans)'],
      },
      maxWidth: {
        prose: '68ch',
      },
      borderRadius: {
        DEFAULT: '0px',
      },
    },
  },
  plugins: [],
};

export default config;
