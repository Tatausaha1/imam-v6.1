
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
      },
      build: {
        // Bundle utama aplikasi cukup besar karena banyak modul fitur + export libs.
        // Warning dinaikkan agar build log lebih relevan dan tidak false alarm.
        chunkSizeWarningLimit: 1200,
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor_react: ['react', 'react-dom'],
              vendor_firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              vendor_qr_pdf: ['html5-qrcode', 'jspdf', 'jspdf-autotable', 'qrcode.react'],
              vendor_xlsx: ['xlsx'],
              vendor_icons: ['lucide-react'],
            }
          }
        }
      }
    };
});
