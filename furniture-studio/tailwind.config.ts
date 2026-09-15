import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // rgb(var(...) / <alpha-value>) — так классы вида bg-canvas/50,
        // text-ink/70 и т.д. остаются рабочими, а сами R G B подставляются
        // из CSS-переменных в globals.css, которые меняются по data-theme.
        // См. globals.css и components/theme/ThemeToggle.tsx.
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        walnut: 'rgb(var(--color-walnut) / <alpha-value>)',
        walnutDark: 'rgb(var(--color-walnut-dark) / <alpha-value>)',
        stone: 'rgb(var(--color-stone) / <alpha-value>)',
        espresso: 'rgb(var(--color-espresso) / <alpha-value>)',
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
