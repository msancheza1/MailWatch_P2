import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

/**
 * Los paquetes @mailwatch/* se consumen como TypeScript sin compilar (no tienen
 * paso de build propio). Se apunta el alias directamente al código fuente para
 * que Vite los transpile y los empaquete en cada proceso; si se resolvieran por
 * node_modules, electron-vite los trataría como dependencias externas y Electron
 * intentaría cargar `.ts` en tiempo de ejecución.
 */
const alias = {
  '@mailwatch/core': resolve(__dirname, '../../packages/core/src/index.ts'),
  '@mailwatch/fixtures': resolve(__dirname, '../../packages/fixtures/src/index.ts'),
};

export default defineConfig({
  main: {
    resolve: { alias },
    build: {
      rollupOptions: { external: ['electron'] },
    },
  },
  preload: {
    resolve: { alias },
    build: {
      rollupOptions: { external: ['electron'] },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: { alias },
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
});
