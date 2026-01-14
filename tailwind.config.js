/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // YCKC brand colors - matched from youthchoruskc.org
        yckc: {
          primary: '#263c8a',    // YCKC blue (from website)
          secondary: '#f5f5f5',  // Light gray background
          accent: '#1e3070',     // Darker blue for hover
          gold: '#c9a227',       // Gold accent
        },
      },
    },
  },
  plugins: [],
}
