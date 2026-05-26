import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/vehicle-access/', // GitHub repo name

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR disabled in AI Studio via DISABLE_HMR env var
      hmr: process.env.DISABLE_HMR !== 'true',

      // Disable file watching when HMR disabled
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
