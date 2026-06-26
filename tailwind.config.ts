/**
 * tailwind.config.ts
 * ─────────────────────────────────────────────────────────────
 * Extiende Tailwind con los tokens de diseño de la boda.
 * Permite usar clases como bg-bronze, text-olive, etc.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Paleta de colores de la boda
      colors: {
        bronze: {
          DEFAULT: "#8C6A3F",
          light: "#C4964A",
          pale: "#E8D5B7",
        },
        olive: {
          DEFAULT: "#5C6B3A",
          muted: "#8A9468",
          pale: "#D4DBC4",
        },
        cream: {
          DEFAULT: "#F7F3EC",
          dark: "#EDE7DB",
        },
        brown: {
          dark: "#2E1F0E",
          mid: "#6B4C2A",
        },
        "wedding-white": "#FDFAF5",
      },

      // Tipografías
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["Lato", "system-ui", "sans-serif"],
      },

      // Tamaños de fuente fluidos
      fontSize: {
        "display-xl": "clamp(3rem, 8vw, 6rem)",
        "display-lg": "clamp(2rem, 5vw, 3.5rem)",
        "display-md": "clamp(1.5rem, 3vw, 2.25rem)",
      },

      // Espaciado extra
      spacing: {
        section: "clamp(4rem, 8vw, 8rem)",
        18: "4.5rem",
        22: "5.5rem",
      },

      // Breakpoints adicionales
      screens: {
        xs: "375px",
      },

      // Animaciones
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "count-down": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease forwards",
        "fade-in": "fade-in 0.5s ease forwards",
        "count-down": "count-down 0.3s ease forwards",
      },

      // Aspect ratio para la galería
      aspectRatio: {
        "4/3": "4 / 3",
        "3/2": "3 / 2",
      },
    },
  },
  plugins: [],
};

export default config;
