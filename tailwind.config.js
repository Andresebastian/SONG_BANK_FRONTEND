/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          terracota: '#E2725B',
          'terracota-dark': '#D1624B',
          blanco: '#FFFFFF',
          'blanco-soft': '#F8F9FA',
        },
        backgroundImage: {
          'terracota-gradient': 'linear-gradient(135deg, #E2725B 0%, #D1624B 100%)',
        },
      },
    },
    plugins: [],
  };
  