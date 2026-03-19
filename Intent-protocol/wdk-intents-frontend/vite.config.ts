import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['crypto', 'stream', 'util', 'buffer', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // sodium-native is a C++ addon that cannot run in the browser.
      // sodium-universal will fall back to sodium-javascript (pure JS/WASM).
      'sodium-native': 'sodium-javascript',
    },
  },
  build: {
    rollupOptions: {
      // Ensure Rolldown doesn't error on optional native modules
      external: ['sodium-native'],
    },
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy Bitfinex pricing API to avoid CORS in dev
      '/api/bitfinex': {
        target: 'https://api-pub.bitfinex.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/bitfinex/, ''),
      },
    },
  },
})
