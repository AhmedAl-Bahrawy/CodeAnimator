import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': import.meta.dirname + '/src',
      '@features': import.meta.dirname + '/src/features',
      '@services': import.meta.dirname + '/src/services',
      '@state': import.meta.dirname + '/src/state',
      '@ui': import.meta.dirname + '/src/ui',
      '@shell': import.meta.dirname + '/src/shell',
      '@types': import.meta.dirname + '/src/types',
    },
  },
})
