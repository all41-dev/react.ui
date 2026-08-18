import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Everything the published bundle imports at runtime is externalized and declared
 * as a peerDependency, so a consumer's copy of react-hook-form / zod / sonner /
 * react-tooltip is the only copy in play (duplicated copies mean separate React
 * contexts, separate toast registries, and failing zod `instanceof` checks).
 *
 * Exact-anchored where a subpath must stay bundled: `react-tooltip` is external as
 * JS, but `react-tooltip/dist/react-tooltip.css` is deliberately NOT matched so it
 * keeps landing in dist/react.ui.css.
 */
const libExternal = [
  /^react$/,
  /^react\//,
  /^react-dom$/,
  /^react-dom\//,
  /^@tanstack\/react-query$/,
  /^@tanstack\/react-table$/,
  /^@tanstack\/react-virtual$/,
  /^react-hook-form$/,
  /^@hookform\/resolvers/,
  /^zod$/,
  /^zod\//,
  /^sonner$/,
  /^axios$/,
  /^react-tooltip$/,
  /*
   * The code editor's engine. Shipped as dependencies rather than peers, so consumers
   * get them transitively — but kept external so two copies of @codemirror/state can
   * never coexist. A duplicated state module makes the editor throw at runtime rather
   * than degrade. Prettier is imported on demand by the format command and must stay a
   * separate chunk in the consumer's build.
   */
  /^@codemirror\//,
  /^@lezer\//,
  /^prettier$/,
  /^prettier\//,
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  if (isLib) {
    // Library build configuration
    return {
      plugins: [tailwindcss(), react()],
      build: {
        lib: {
          /*
           * Two entries so the standalone code editor is its own import path. Bundling
           * it into the main entry would hand every consumer the CodeMirror engine;
           * the grid itself reaches the editor through a dynamic import.
           */
          entry: {
            'react-ui': 'src/index.ts',
            'code-editor': 'src/code-editor.ts',
          },
          name: 'ReactUI',
          formats: ['es', 'cjs'],
          fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`
        },
        rollupOptions: {
          external: libExternal,
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            }
          }
        },
        emptyOutDir: false,
        copyPublicDir: false, // don't ship the sandbox's public/ assets to consumers
        sourcemap: true,
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