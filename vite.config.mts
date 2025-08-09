import { defineConfig } from 'vite'
import hotReload from 'hot-reload-extension-vite'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    hotReload({
      log: true, // set to false if you don't want console logs
      backgroundPath: path.resolve(__dirname, 'src/background.ts'),
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'src/assets/images/*',
          dest: 'assets/images' // copies all images to dist/assets/images/
        },
        {
          src: 'src/assets/css/styles.css',
          dest: 'assets/css' // copies styles.css to dist/assets/css/
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
