import { defineConfig, mergeConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import playground from './vite.playground.config.ts'

export default mergeConfig(playground, defineConfig({
  build: {
    outDir: 'dist-r',
    rollupOptions: { input: fileURLToPath(new URL('./r.html', import.meta.url)) },
  },
}))
