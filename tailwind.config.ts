import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#0d0f12",
          soft: "#15181d",
          line: "#242a32",
        },
      },
    },
  },
  plugins: [],
};

export default config;
