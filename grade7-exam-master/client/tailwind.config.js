/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17231C',
        paper: '#F4F7F3',
        card: '#FFFFFF',
        line: '#DCE3DC',
        eagle: { DEFAULT: '#1E7A46', dark: '#175C36', pale: '#E7F3EB' },
        copper: { DEFAULT: '#B4641E', pale: '#F7ECDF' },
        flagred: '#C0331E',
        sun: '#E8850C',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
