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
          src: 'src/assets/images/*.png',
          dest: '.' // copies to dist/
        },
        {
          src: 'src/popup.html',
          dest: '.' // copies popup.html to dist/popup.html
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
