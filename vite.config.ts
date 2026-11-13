import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' so the built site also works from a GitHub Pages sub-path.
export default defineConfig({
  plugins: [react()],
  base: './',
})
