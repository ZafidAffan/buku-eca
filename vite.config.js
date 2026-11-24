import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  css: {
    postcss: {},
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
