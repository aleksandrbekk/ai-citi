import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Минификация
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Оптимизация бандла
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('sonner') || id.includes('date-fns') || id.includes('recharts')) {
              return 'vendor-utils'
            }
            // Остальные пакеты — пусть Rollup решает сам
            // Это позволяет lazy-loaded страницам грузить свои пакеты отдельно
          }
          // App chunks - разбиваем по фичам
          if (id.includes('/pages/admin/')) {
            return 'pages-admin'
          }
          if (id.includes('/pages/agents/')) {
            return 'pages-agents'
          }
          if (id.includes('/pages/school/')) {
            return 'pages-school'
          }
          if (id.includes('/pages/quizzes/')) {
            return 'pages-quizzes'
          }
          if (id.includes('/pages/tools/')) {
            return 'pages-tools'
          }
          if (id.includes('/store/')) {
            return 'app-stores'
          }
          if (id.includes('/components/')) {
            return 'app-components'
          }
        },
      },
    },
    // Увеличиваем лимит предупреждения
    chunkSizeWarningLimit: 500,
    // Source maps только в dev
    sourcemap: false,
  },
  // Оптимизация dev сервера
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },
})