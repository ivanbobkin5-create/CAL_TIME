import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
        'react': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'node_modules/react'),
        'react-dom': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      reportCompressedSize: false,
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('xlsx') || id.includes('papaparse')) {
                return 'vendor-excel';
              }
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              return 'vendor-others';
            }
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
