/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#F3F0E8',
        paper: '#F3F0E8',
        surface: { DEFAULT: '#FBF9F4', 2: '#F0EDE5' },
        rule: { DEFAULT: '#DCD6C9', strong: '#C8C0B0' },
        ink: { DEFAULT: '#1E1D1A', soft: '#4A4741', mute: '#6D685F', faint: '#948E82' },
        line: '#DCD6C9',
        brand: { DEFAULT: '#0F5A45', dark: '#0B4535', tint: 'rgba(15, 90, 69, 0.08)' },
        pine: '#173F33',
      },
      boxShadow: { card: 'none', panel: 'none', pop: 'none' },
      borderRadius: { xl2: '3px', sm: '2px', DEFAULT: '3px', md: '3px', lg: '3px', xl: '4px', '2xl': '4px', '3xl': '4px' },
    },
  },
  plugins: [],
}
