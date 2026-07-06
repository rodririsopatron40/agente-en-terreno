import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Asistente en Terreno',
        short_name: 'Terreno',
        description: 'Asistente de reparaciones en terreno, offline-first.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // App shell + config se precachean; los packs (grandes) NO.
        globPatterns: ['**/*.{js,css,html,svg,woff2,json,webmanifest}'],
        globIgnores: ['**/packs/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/packs\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // Solo imagenes de packs y solo peticiones sin query. El importador
            // descarga con ?dl=1 (excluido aca) para verificar el hash sobre
            // bytes frescos; las <img> sin query se sirven cache-first desde
            // 'pack-assets', ya poblada por el importador -> funcionan offline.
            urlPattern: ({ url }) =>
              /\/packs\/.*\.(png|webp|jpe?g|svg)$/.test(url.pathname) && url.search === '',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pack-assets',
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
