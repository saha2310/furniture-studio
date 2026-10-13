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
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        // Брендовый зелёный акцент (активная категория/таб, тумблер темы,
        // hover CTA и пагинации, стрелка «Смотреть» на карточке работы).
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accentStrong: 'rgb(var(--color-accent-strong) / <alpha-value>)',
        // Отдельный акцент только для сердечка «избранное» — намеренно НЕ
        // равен accent, см. комментарий у --color-favorite в globals.css.
        favorite: 'rgb(var(--color-favorite) / <alpha-value>)',
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
