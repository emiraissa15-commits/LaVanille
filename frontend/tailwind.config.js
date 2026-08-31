/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f9f1',
          100: '#e1f2e0',
          200: '#c5e5c2',
          300: '#9acc96',
          400: '#68ab62',
          500: '#4a8d45',
          600: '#3a7236',
          700: '#2f5b2c',
          800: '#284926',
          900: '#213d20',
        },
      },
    },
  },
  plugins: [],
}
