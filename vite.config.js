// vite.config.js - FIXED VERSION
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
      // ✅ FIX: Add workbox configuration to handle large files
      workbox: {
        // Increase maximum file size to cache (default is 2MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // Define which files to cache
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude large chunks from precaching
        globIgnores: [
          '**/index-*.js',
          '**/vendor-*.js',
          '**/tesseract-*.js',
          '**/*.map'
        ],
        // Runtime caching for large assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/kkxgrrcbyluhdfsoywvd\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
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
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'vendor': ['axios', 'lodash'],
          'tesseract': ['tesseract.js'],
          'ui': ['framer-motion', 'react-hot-toast'],
          'icons': ['react-icons']
        },
        // Ensure chunks are properly named
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
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
  // ✅ Optional: Add optimize deps to pre-bundle large dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'react-hot-toast'],
    exclude: ['tesseract.js'] // Tesseract is large, exclude from pre-bundling
  }
});