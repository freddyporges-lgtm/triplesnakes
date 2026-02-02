/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#041014',
        secondary: '#0c1f26',
        accent: '#1dd68f',
        accentSoft: '#0c3a2a',
        text: '#f4f9fb',
        muted: '#88a0aa',
        danger: '#ff4b6a',
        warning: '#ffd166',
        highlight: '#1dd68f',
        success: '#1dd68f',
      },
      animation: {
        'pulse-highlight': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
