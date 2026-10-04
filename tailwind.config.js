/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        canvas: 'transparent',
        ink: { DEFAULT: '#14112a', soft: '#45405e', mute: '#6b6784', faint: '#9a97ad' },
        line: 'rgba(120, 110, 170, 0.16)',
        brand: { DEFAULT: '#6d4aff', dark: '#5233e8', tint: 'rgba(109, 74, 255, 0.10)' },
      },
      boxShadow: {
        card: 'var(--shadow-1)',
        panel: 'var(--shadow-3)',
        pop: 'var(--shadow-2)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
}
