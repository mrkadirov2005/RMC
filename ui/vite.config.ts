import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('/@reduxjs/') || id.includes('/react-redux/') || id.includes('/redux-persist/') || id.includes('/axios/')) {
            return 'vendor-data'
          }
          if (id.includes('/@radix-ui/')) {
            return 'vendor-radix'
          }
          if (id.includes('/@mui/') || id.includes('/@emotion/')) {
            return 'vendor-mui'
          }
          if (id.includes('/lucide-react/') || id.includes('/react-icons/')) {
            return 'vendor-icons'
          }
          if (id.includes('/react-calendar/')) {
            return 'vendor-calendar'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // frontend dev server
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // local backend
        changeOrigin: true,
      },
    },
  },
})
