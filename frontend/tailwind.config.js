/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        khmer: ['"Noto Sans Khmer"', '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f4f1fb",
          100: "#e6ddf6",
          200: "#cebaee",
          300: "#b093e3",
          400: "#8a63e6",
          500: "#6f3fd8",
          600: "#5a2fc0",
          700: "#48249a",
          800: "#391d78",
          900: "#241255",
        },
        accent: {
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 12, 34, 0.04), 0 8px 24px -8px rgba(90, 47, 192, 0.12)",
        softLg: "0 4px 12px rgba(16, 12, 34, 0.06), 0 24px 48px -16px rgba(90, 47, 192, 0.18)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6f3fd8 0%, #8a63e6 45%, #ec4899 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
