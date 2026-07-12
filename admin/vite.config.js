import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Проксируем API на наш Express — тогда /api тот же origin, что и админка,
    // и httpOnly-cookie сессии работает без CORS. В проде /admin и /api на одном
    // домене (nginx), поэтому там тоже относительный /api.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      // Фото машин лежат на бэкенде (dist/cars). В проде тот же домен.
      '/cars': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
});
