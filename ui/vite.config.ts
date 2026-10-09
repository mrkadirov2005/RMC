import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// The dev server talks to the local backend on every branch except main, so develop and feature
// branches never read or write production data. main keeps ui/.env (the production API).
// `vite build` is untouched, and an explicit VITE_API_BASE_URL in the shell always wins.
const currentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

export default defineConfig(({ command }) => {
  if (command === 'serve' && !process.env.VITE_API_BASE_URL) {
    const branch = currentBranch()
    if (branch && branch !== 'main') {
      process.env.VITE_API_BASE_URL = `http://localhost:${process.env.LOCAL_API_PORT || 4000}/api`
    }
  }

  return {
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
  }
})
