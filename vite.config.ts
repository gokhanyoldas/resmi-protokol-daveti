import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import commonjs from 'vite-plugin-commonjs';
import requireTransform from 'vite-plugin-require-transform';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(), 
        tailwindcss(),
        commonjs(),
        requireTransform({})
      ],
      optimizeDeps: {
        include: [
          'react', 
          'react-dom', 
          'react-dom/client',
          'motion/react',
          '@react-three/fiber', 
          '@react-three/drei'
        ],
        exclude: ['three'],
        esbuildOptions: {
          define: {
            global: 'globalThis'
          }
        }
      },
      build: {
        commonjsOptions: {
          include: [/node_modules/],
          transformMixedEsModules: true,
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'global': 'globalThis'
      },
      resolve: {
        dedupe: ['react', 'react-dom', 'three'],
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
