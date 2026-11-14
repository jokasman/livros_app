import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// BASE_PATH: caminho onde a app é publicada (ex.: "/livros_app/" no GitHub Pages).
const base = process.env.BASE_PATH || '/'

// Identificação da versão publicada: data/hora (Lisboa) + commit.
const buildDate = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date())
const commit = (process.env.GITHUB_SHA || 'local').slice(0, 7)

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version} · ${buildDate} · ${commit}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Livros — o meu registo de leituras',
        short_name: 'Livros',
        description: 'Regista os livros que leste, estás a ler ou queres ler.',
        lang: 'pt-PT',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f3ec',
        theme_color: '#7c4a1e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Capas dos livros: ficam em cache para funcionar offline.
            urlPattern: ({ url }) =>
              url.hostname === 'covers.openlibrary.org' ||
              url.hostname === 'books.google.com' ||
              url.hostname.endsWith('.googleusercontent.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
