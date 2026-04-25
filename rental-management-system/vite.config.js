import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  // Default to relative asset paths for production so dist can be previewed
  // locally or hosted from arbitrary subpaths. Override when needed.
  base: command === 'build' ? (process.env.VITE_BASE_PATH || './') : '/',
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}))
