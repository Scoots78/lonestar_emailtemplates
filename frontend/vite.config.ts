import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/render': 'http://localhost:3001'
    }
  },
  build: { outDir: 'dist' }
})
