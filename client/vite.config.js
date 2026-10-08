import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Production API: set VITE_API_URL on Render
  // (e.g. https://your-backend.infinityfreeapp.com).
  // Local dev uses the proxy below when VITE_API_URL is empty.
  // NOTE: local PHP backend runs on :8000 (php -S), NOT :5000.
  server: { port: 5173, proxy: { '/api': 'http://localhost:8000', '/uploads': 'http://localhost:8000' } }
});

