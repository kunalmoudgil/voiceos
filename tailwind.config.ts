import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0b",
        surface: "#121214",
        surface2: "#1b1b1f",
        border: "#2a2a2f",
        accent: "#5b8cff",
        accent2: "#8b5bff",
        danger: "#ff5b6a",
        success: "#36d399",
        warn: "#ffb020",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(91,140,255,0.25), 0 8px 24px -8px rgba(91,140,255,0.45)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.6s cubic-bezier(0.3,0,0.6,1) infinite",
        fadeIn: "fadeIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
