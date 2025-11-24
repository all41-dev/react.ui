import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  if (isLib) {
    // Library build configuration
    return {
      plugins: [tailwindcss(), react()],
      build: {
        lib: {
          entry: 'src/index.ts',
          name: 'ReactUI',
          formats: ['es', 'cjs'],
          fileName: (format) => `react-ui.${format === 'es' ? 'js' : 'cjs'}`
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            }
          }
        },
        emptyOutDir: false,
        sourcemap: false,
        cssCodeSplit: false
      }
    }
  }

  // Development configuration
  return {
    plugins: [tailwindcss(), react()],
    build: {
      outDir: 'dist'
    },
    preview: {
      port: 3333,
      strictPort: true,
    },
    server: {
      sourcemap: false,
      host: '0.0.0.0',
      port: 3333,
      allowedHosts: ['dev.react.ch', 'localhost:7000'],
    },
  }
})