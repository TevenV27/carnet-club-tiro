/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'card-gold': '#D4AF37',
        'card-dark': '#1a1a1a',
        'tactical-dark': '#000000',
        'tactical-darker': '#000000',
        'tactical-gold': '#D4AF37',
        'tactical-brass': '#af9974',
        'tactical-gray': '#0a0a0a',
        'tactical-border': '#2a2a2a',
        'terminal-green': '#D4AF37',
        'terminal-dark-green': '#af9974',
        'terminal-bg': '#000000',
        'terminal-bg-dark': '#0a0a0a',
      },
      fontFamily: {
        'tactical': ['Courier New', 'monospace'],
      },
      boxShadow: {
        'tactical': '0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.5)',
        'tactical-glow': '0 0 20px rgba(212, 175, 55, 0.5)',
      },
    },
  },
  plugins: [],
}

