import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' → GitHub Pages 하위 경로(/rehearsal-student/)에서도 동작
export default defineConfig({
  plugins: [react()],
  base: './',
})
