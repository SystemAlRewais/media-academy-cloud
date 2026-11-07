import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project-site URL: /<repository-name>/
  base: '/media-academy-cloud/',
  plugins: [react()],
  server: {
    host: '0.0.0.0'
  }
});
