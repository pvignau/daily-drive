import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy spotify tokens (kept for backwards compat)
        spotify: {
          green: "#1DB954",
          black: "#191414",
          dark: "#121212",
          gray: "#535353",
          lightgray: "#B3B3B3",
        },
        // Stitch design system tokens
        "surface":                "#131313",
        "surface-lowest":         "#0e0e0e",
        "surface-low":            "#1c1b1b",
        "surface-container":      "#201f1f",
        "surface-high":           "#2a2a2a",
        "surface-highest":        "#353534",
        "surface-bright":         "#393939",
        "on-surface":             "#e5e2e1",
        "on-surface-variant":     "#bccbb9",
        "primary":                "#53e076",
        "primary-container":      "#1db954",
        "on-primary":             "#003914",
        "outline-variant":        "#3d4a3d",
        "outline":                "#869585",
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        lg: "2rem",
        xl: "3rem",
        full: "9999px",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #53e076 0%, #1db954 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
