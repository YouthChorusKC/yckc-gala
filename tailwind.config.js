/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // A Sky Full of Stars - Gala 2026 Theme
        gala: {
          navy: '#1a2744',      // Deep navy blue background
          navyLight: '#263a5c', // Lighter navy for cards
          gold: '#c9a227',      // Gold accent
          goldLight: '#d4b84a', // Lighter gold for hover
          goldDark: '#a68920',  // Darker gold
          cream: '#f8f5eb',     // Cream/off-white
        },
        // YCKC brand colors
        yckc: {
          primary: '#263c8a',    // YCKC blue (from website)
          secondary: '#f5f5f5',  // Light gray background
          accent: '#1e3070',     // Darker blue for hover
          gold: '#c9a227',       // Gold accent
        },
      },
      fontFamily: {
        script: ['Playfair Display', 'serif'],
        elegant: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
}
