import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DCP',
      fileName: (format) => (format === 'umd' ? 'dcp-sdk.umd.js' : 'index.js'),
    },
    emptyOutDir: true,
  },
});
