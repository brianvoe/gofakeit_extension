import { defineConfig } from 'vite'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'src/assets/images/*',
          dest: 'assets/images' // copies all images to dist/assets/images/
        },
        {
          src: 'src/popup.html',
          dest: '.' // copies popup.html to dist/popup.html
        },
        {
          src: 'public/manifest.json',
          dest: '.' // copies manifest.json to dist/
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Disable minification for debugging
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content.ts'),
        background: path.resolve(__dirname, 'src/background.ts'),
        popup: path.resolve(__dirname, 'src/popup.ts')
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js'
      }
    }
  }
})
