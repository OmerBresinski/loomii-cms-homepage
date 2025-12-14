import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Match homepage styling
        primary: {
          DEFAULT: "rgb(244 90 90)",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#161616",
        },
        foreground: {
          DEFAULT: "#ffffff",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        card: {
          DEFAULT: "#111111",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#111111",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#1a1a1a",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "rgba(255, 255, 255, 0.1)",
        input: "rgba(255, 255, 255, 0.1)",
        ring: "rgb(244 90 90)",
        // Status colors
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
