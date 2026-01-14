/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // YCKC brand colors - adjust as needed
        yckc: {
          primary: '#1e3a5f',    // Deep blue
          secondary: '#c9a227',  // Gold
          accent: '#2d5a87',     // Medium blue
        },
      },
    },
  },
  plugins: [],
}
