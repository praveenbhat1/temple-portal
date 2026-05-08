import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff9f0",
          100: "#fef3c7",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
        },
        vermillion: {
          DEFAULT: "#991b1b",
          light: "#fef2f2",
        },
        gold: {
          200: "#fef08a",
          400: "#fbbf24",
          600: "#d4af37",
          700: "#b48c2d",
        },
        ivory: "#fdfcf0",
        cream: "#fffaf5",
        background: "#fffaf5",
        foreground: "#2d241e",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
