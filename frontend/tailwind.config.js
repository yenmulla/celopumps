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
        background: "#08090c",
        surface: "#111319",
        primary: "#6366f1", // Electric Indigo / Ethereum Blue
        secondary: "#ff007a", // Uniswap Pink / Pink-Magenta
        accent: "#10b981", // Emerald Green
      },
    },
  },
  plugins: [],
};
