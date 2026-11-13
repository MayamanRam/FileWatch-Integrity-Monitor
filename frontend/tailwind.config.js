/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "#070B14",
        card: "#0D1527",
        "card-hover": "#131E38",
        border: "#1E293B",
        primary: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
          light: "#38BDF8"
        },
        cyan: {
          glow: "#06B6D4",
          light: "#22D3EE"
        },
        purple: {
          accent: "#8B5CF6",
          dark: "#6D28D9"
        },
        critical: "#EF4444",
        high: "#F97316",
        medium: "#F59E0B",
        low: "#10B981"
      }
    },
  },
  plugins: [],
}

