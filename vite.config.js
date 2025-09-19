// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ Load .env variables before config is evaluated
dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Omniflow App',
        short_name: 'Omniflow',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#f97316', // orange accent
        description: 'Your all-in-one marketplace & finance app',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
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
    sourcemap: false, // disable source maps in production builds
    minify: 'esbuild', // faster & less memory than terser
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
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
