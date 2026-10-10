import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend NestJS (backend/, `npm run start:dev`). Mesma origem => cookie de sessão sem CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
