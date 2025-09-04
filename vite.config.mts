import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const target = process.env.TARGET || 'chrome'

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './src/manifest.json',
      watchFilePaths: [
        'src/**/*'
      ],
      disableAutoLaunch: true,
      // Build for specific browser based on TARGET env var
      browser: target,
    }),
    viteStaticCopy({
      targets: [
        // {
        //   src: 'src/assets/**/*',
        //   dest: 'assets'
        // }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false // Disable minification for debugging
  },
  define: {
    __BROWSER__: JSON.stringify(target),
  }
})
