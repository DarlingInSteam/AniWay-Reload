import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',  // Важно для Docker
    proxy: {
      '/api': {
        target: 'http://gateway-service:8080',  // Используем имя сервиса для Docker
        changeOrigin: true,
      },
    },
  },
})
