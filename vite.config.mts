import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',         // output directory for bundled files
    emptyOutDir: true,      // clear previous builds in dist
    rollupOptions: {
      // Specify the content script entry file (no index.html needed)
      input: resolve(__dirname, 'src/content.ts'),
      output: {
        format: 'iife',               // bundle as an IIFE script:contentReference[oaicite:3]{index=3}
        entryFileNames: 'content.js'  // name of the output bundle
      }
    }
    // Alternatively, you could use library mode:
    // lib: {
    //   entry: resolve(__dirname, 'src/content.ts'),
    //   name: 'ContentScript',        // global name for IIFE (if any exports)
    //   formats: ['iife']
    // },
  }
});
