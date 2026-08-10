import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { qrcode } from 'vite-plugin-qrcode'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), qrcode()],
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  build: {
    cssMinify: false,
  },
  server: {
    host: true,
  },
})
