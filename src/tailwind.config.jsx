/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enables dark mode switching via class
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        light: "#ffffff",
        dark: "#0f172a", // Tailwind's dark background
      },
      backgroundColor: {
        base: "#ffffff", // default light background
        "base-dark": "#0f172a", // dark mode background
      },
    },
  },
  plugins: [],
};
