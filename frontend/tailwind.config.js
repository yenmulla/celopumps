/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0b0d",
        surface: "#14161a",
        primary: "#35d07f", // Celo Green
        secondary: "#fbcc5c", // Celo Gold
      },
    },
  },
  plugins: [],
};
