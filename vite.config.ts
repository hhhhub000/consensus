/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    // firebase SDK は単一ベンダーチャンクとして 500kB を超えるため閾値を調整
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // 保守性のためベンダーを役割ごとに分割 (firebase が最大なので独立チャンクに)
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
