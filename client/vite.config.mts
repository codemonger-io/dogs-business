import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import markdown from 'unplugin-vue-markdown/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/app',
  server: {
    port: 5174
  },
  plugins: [
    vue({
      include: [/\.vue$/, /\.md$/]
    }),
    markdown()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // workaround to an error "Can't find variable: __publicField"
  // https://github.com/maplibre/maplibre-gl-js/issues/6680#issuecomment-3825893338
  optimizeDeps: {
    include: ['maplibre-gl'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
})
