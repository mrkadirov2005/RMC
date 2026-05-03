import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // frontend dev server
    proxy: {
      '/api': {
        target: 'https://temurbek.m-kadirov.uz', // backend
        changeOrigin: true,
      },
    },
  },
})