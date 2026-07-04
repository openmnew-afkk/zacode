import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base: '/' — для кастомного домена или Vercel
  // base: '/zacode/' — для GitHub Pages (repo name)
  base: '/zacode/',
  server: {
    host: true,
    port: 5173,
  },
});
