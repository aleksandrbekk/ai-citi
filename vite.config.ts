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
    // Оптимизация бандла
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI библиотеки
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // Data layer
          'vendor-data': ['@tanstack/react-query', 'zustand', '@supabase/supabase-js'],
        },
      },
    },
    // Увеличиваем лимит предупреждения
    chunkSizeWarningLimit: 600,
  },
})