/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff', 100: '#d9e6ff', 200: '#bcd2ff', 300: '#8eb3ff',
          400: '#5888ff', 500: '#2f5fff', 600: '#173df5', 700: '#122ee1',
          800: '#1628b6', 900: '#19288f', 950: '#141a57',
        },
        ink: {
          50: '#f6f7f9', 100: '#eceef2', 200: '#d4d9e2', 300: '#aeb7c9',
          400: '#8190ab', 500: '#607091', 600: '#4c5a78', 700: '#3f4a62',
          800: '#374053', 900: '#313847', 950: '#1d212b',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)',
        card: '0 4px 24px -8px rgba(16,24,40,.12)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'fade-in': 'fade-in .3s ease-out' },
    },
  },
  plugins: [],
}
