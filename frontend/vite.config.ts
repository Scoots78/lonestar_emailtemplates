import { defineConfig } from 'vite'

// Use function form to differentiate dev vs prod settings
export default defineConfig(({ mode }) => {
  // Plesk deployment – assets served from /app/
  const base = '/app/'

  // In this new setup the API lives on the same origin & root path,
  // so the base for calls is an empty string in both dev and prod.
  const API_BASE = ''

  return {
    base,

    define: {
      // Expose API base at build time
      'import.meta.env.VITE_API_BASE': JSON.stringify(API_BASE)
    },

    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001',
        '/render': 'http://localhost:3001'
      }
    },

    build: { outDir: 'dist' }
  }
})
