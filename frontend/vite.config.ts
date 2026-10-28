import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Root node_modules contains hoisted packages (react, react-router-dom, etc.)
const ROOT_MODULES = path.resolve(__dirname, '../node_modules');

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});
