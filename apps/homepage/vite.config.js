import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // No plugins needed for vanilla HTML/Tailwind
  server: {
    port: 3002
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pitch: resolve(__dirname, 'pitch.html'),
      },
    },
  },
})

