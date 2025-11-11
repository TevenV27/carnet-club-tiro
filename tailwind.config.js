const withOpacityValue = (variable) => ({ opacityValue } = {}) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}) / 1)`
  }

  return `rgb(var(${variable}) / ${opacityValue})`
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'card-gold': withOpacityValue('--color-accent'),
        'card-dark': withOpacityValue('--surface-bg-rgb'),
        'tactical-dark': withOpacityValue('--surface-bg-rgb'),
        'tactical-darker': withOpacityValue('--surface-active-bg-rgb'),
        'tactical-gold': withOpacityValue('--color-accent'),
        'tactical-brass': withOpacityValue('--color-text-secondary'),
        'tactical-gray': withOpacityValue('--surface-hover-bg-rgb'),
        'tactical-border': withOpacityValue('--color-border'),
        'terminal-green': withOpacityValue('--color-accent'),
        'terminal-dark-green': withOpacityValue('--color-text-secondary'),
        'terminal-bg': withOpacityValue('--surface-bg-rgb'),
        'terminal-bg-dark': withOpacityValue('--surface-hover-bg-rgb'),
      },
      fontFamily: {
        'tactical': ['"Barlow Semi Condensed"', '"Barlow Condensed"', '"Red Hat Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'tactical': '0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.5)',
        'tactical-glow': '0 0 20px rgba(212, 175, 55, 0.5)',
      },
    },
  },
  plugins: [],
}

