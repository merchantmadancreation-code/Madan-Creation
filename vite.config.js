import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return {
      plugins: [react()],
      server: {
        allowedHosts: true,
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
      }
      // Dev specific config
    }
  } else {
    // command === 'build'
    return {
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 1500
      }
    }
  }
})
