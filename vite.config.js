import { defineConfig } from 'vite'
import FullReload from 'vite-plugin-full-reload'

export default defineConfig({
  plugins: [
    FullReload(['src/visuals/**/*.css', 'index.html'])
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})
