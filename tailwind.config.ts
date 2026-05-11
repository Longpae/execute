import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        execute: {
          bg: "#0D0D0D",
          card: "#181818",
          cardSoft: "#202020",
          line: "#2A2A2A",
          primary: "#F3F3F3",
          secondary: "#8B8B8B",
          accent: "#D9D9D9",
        },
      },
      borderRadius: {
        execute: "22px",
        "execute-sm": "18px",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};

export default config;
