/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: {
          750: '#293548',
          850: '#151e2e',
        },
      },
      boxShadow: {
        glow: '0 0 20px 0 rgba(52, 211, 153, 0.15)',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        scan: 'scan 3s linear infinite',
      },
    },
  },
  plugins: [],
};
