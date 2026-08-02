import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 3331,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
