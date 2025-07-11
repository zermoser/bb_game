import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/bb_game/',
  server: {
    open: true,
    port: 3004
  }
});
