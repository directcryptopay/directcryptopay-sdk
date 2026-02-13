import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DCP',
      fileName: (format) => (format === 'umd' ? 'dcp-sdk.umd.js' : 'index.js'),
    },
    rollupOptions: {
      // Make sure to bundle everything for the UMD build so it works standalone
      output: {
        globals: {
          // If we were excluding them, we'd map them here.
          // For a standalone SDK, we usually bundle dependencies
          // except maybe peerDependencies if strictly required.
        },
      },
    },
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"', // Fix for some libs expecting process.env
  }
});
