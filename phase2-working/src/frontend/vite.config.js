import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 3331,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
