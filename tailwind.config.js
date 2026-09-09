/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        canvas: '#f6f7f9',
        ink: { DEFAULT: '#111827', soft: '#4b5563', mute: '#6b7280', faint: '#9ca3af' },
        line: '#e9ebef',
        brand: { DEFAULT: '#6d4aff', dark: '#5a35f0', tint: '#f3f0ff' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
        panel: '-8px 0 24px rgba(16,24,40,.06)',
        pop: '0 8px 24px rgba(16,24,40,.10)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
}
