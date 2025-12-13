export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                // Custom color palette - dark mode first design
                background: {
                    DEFAULT: "#0a0a0b",
                    secondary: "#111113",
                    tertiary: "#18181b",
                },
                foreground: {
                    DEFAULT: "#fafafa",
                    muted: "#a1a1aa",
                    subtle: "#71717a",
                },
                accent: {
                    DEFAULT: "#6366f1",
                    hover: "#818cf8",
                    muted: "#4f46e5",
                },
                border: {
                    DEFAULT: "#27272a",
                    hover: "#3f3f46",
                },
                success: "#22c55e",
                warning: "#f59e0b",
                error: "#ef4444",
            },
            fontFamily: {
                sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
                mono: ["IBM Plex Mono", "Menlo", "monospace"],
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "slide-up": "slideUp 0.4s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
    plugins: [],
};
