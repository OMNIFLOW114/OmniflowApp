// vite.config.js
import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Load environment variables

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': process.env, // Makes VITE_OPENAI_API_KEY and others accessible
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    sourcemap: true,
    minify: 'esbuild', // Faster minification
    rollupOptions: {
      output: {
        manualChunks: {
          // Optional: separate AI libs like tesseract or heavy dependencies
          tesseract: ['tesseract.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
});
