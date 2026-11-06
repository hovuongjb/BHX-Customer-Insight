/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bhx: {
          green: "#1a7a3c",
          greenDark: "#0f5c2b",
          yellow: "#ffe14d",
        },
      },
    },
  },
  plugins: [],
};
