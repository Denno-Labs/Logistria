/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#081021', // Deep Space Navy
          orange: '#FF8C00', // Alert/Growth Orange
          teal: '#00C9B1' // Network/Success Teal
        }
      }
    },
  },
  plugins: [],
}