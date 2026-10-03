// vite.config.js - Native-safe PWA config
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { VitePWA } from 'vite-plugin-pwa';

dotenv.config();

// Detect native build: when we're building for Capacitor we set CAP_BUILD=1
// Otherwise the PWA plugin is enabled as usual for the web deployment.
const isNativeBuild = process.env.CAP_BUILD === '1' || process.env.BUILD_TARGET === 'native';

export default defineConfig({
  plugins: [
    react(),
    // Only enable PWA on web builds. On native builds the service worker
    // conflicts with Capacitor's asset loader and can hold stale chunks,
    // which causes "Unable to open asset URL" and stale auth state.
    ...(isNativeBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt'],
            workbox: {
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
              globIgnores: ['**/index-*.js', '**/vendor-*.js', '**/tesseract-*.js', '**/*.map'],
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  },
                },
                {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts-cache',
                    expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  },
                },
                {
                  urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'images-cache',
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
                  },
                },
                {
                  urlPattern: /^https:\/\/kkxgrrcbyluhdfsoywvd\.supabase\.co\/.*/i,
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'supabase-cache',
                    expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                  },
                },
              ],
            },
            manifest: {
              name: 'Omniflow App',
              short_name: 'Omniflow',
              start_url: '.',
              display: 'standalone',
              background_color: '#ffffff',
              theme_color: '#f97316',
              description: 'Your all-in-one marketplace & finance app',
              icons: [
                { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': JSON.stringify(process.env),
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'vendor': ['axios', 'lodash'],
          'tesseract': ['tesseract.js'],
          'ui': ['framer-motion', 'react-hot-toast'],
          'icons': ['react-icons'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        // ─────────────────────────────────────────────────────────────
        // FIXED ENTRY FILENAME
        // Pinned to a stable name so Android Studio's cached APK and
        // fresh builds agree on the file. Fixes "Unable to open asset
        // URL: index-sYkn8etk.js" white screen on Android.
        // ─────────────────────────────────────────────────────────────
        entryFileNames: 'assets/index-sYkn8etk.js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'react-hot-toast'],
    exclude: ['tesseract.js'],
  },
});