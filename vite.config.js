import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    // Dev server settings
    server: {
      port: 3000,
      open: true,
      // Forward /api/* requests to the Node email server so fetch('/api/send-email')
      // works in development without CORS issues or hardcoded URLs.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },

    // Production build settings
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/firestore']
          }
        }
      }
    },

    resolve: {
      alias: {
        '@': '/src'
      }
    },

    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    }
  };
});