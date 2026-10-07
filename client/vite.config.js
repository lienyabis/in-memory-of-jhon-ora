import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Production API: set VITE_API_URL on Render (e.g. https://jhon-ora-memorial.onrender.com).
  // Local dev still uses the proxy below when VITE_API_URL is empty.
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000', '/uploads': 'http://localhost:5000' } }
});

