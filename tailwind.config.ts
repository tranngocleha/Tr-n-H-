import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ccff",
          300: "#82abff",
          400: "#5586ff",
          500: "#2f63f5",
          600: "#1f4bd1",
          700: "#1a3ca8",
          800: "#193587",
          900: "#182f6c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
