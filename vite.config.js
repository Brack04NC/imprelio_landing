import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        guida: fileURLToPath(new URL('./guida/index.html', import.meta.url)),
      },
    },
  },
});
