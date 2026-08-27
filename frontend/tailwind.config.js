/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f1fb",
          100: "#e6ddf6",
          400: "#8a63e6",
          500: "#6f3fd8",
          600: "#5a2fc0",
          700: "#48249a",
        },
      },
    },
  },
  plugins: [],
};
