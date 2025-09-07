// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

// ✅ Load .env variables before config is evaluated
dotenv.config();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ✅ Allows '@/...' imports
    },
  },
  define: {
    'process.env': JSON.stringify(process.env), // ✅ Fixes: process.env vars must be stringified
  },
  build: {
    target: 'esnext',
    // ✅ Reduce memory pressure
    sourcemap: false, // disable source maps in production builds
    minify: 'esbuild', // faster & less memory than terser
    chunkSizeWarningLimit: 1500, // raise limit so Rollup doesn’t waste time analyzing
    rollupOptions: {
      output: {
        manualChunks: {
          // ✅ Split out heavy deps into separate chunks
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          vendor: ['axios', 'lodash'],
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
