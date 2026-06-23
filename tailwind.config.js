/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff', 100: '#dbe4ff', 200: '#bac8ff',
          300: '#91a7ff', 400: '#748ffc', 500: '#5c7cfa',
          600: '#4c6ef5', 700: '#4263eb', 800: '#3b5bdb',
          900: '#364fc7', 950: '#1c2d6e',
        },
        ink: {
          50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef',
          300: '#dee2e6', 400: '#adb5bd', 500: '#868e96',
          600: '#495057', 700: '#343a40', 800: '#212529',
          900: '#16191d', 950: '#0d0f12',
        },
        status: {
          success: '#2b8a3e',
          warning: '#e67700',
          error: '#c92a2a',
          info: '#1971c2',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / .05)',
        card: '0 1px 3px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .06)',
        md: '0 4px 6px -1px rgb(0 0 0 / .07), 0 2px 4px -2px rgb(0 0 0 / .05)',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
      },
    },
  },
  plugins: [],
}
