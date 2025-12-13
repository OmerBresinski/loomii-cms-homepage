import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
// https://vite.dev/config/
export default defineConfig({
    plugins: [TanStackRouterVite(), react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: process.env.VITE_API_URL || "http://localhost:3001",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
});
