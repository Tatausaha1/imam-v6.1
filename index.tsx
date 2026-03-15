/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Registrasi Service Worker untuk Fitur Instalasi (PWA)
// Folder public akan dipindahkan ke root '/' saat build di Vercel/Vite
if ('serviceWorker' in navigator) {
  let isRefreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        const requestImmediateActivation = () => {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        };

        requestImmediateActivation();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              requestImmediateActivation();
            }
          });
        });

        const triggerUpdateCheck = () => reg.update().catch(() => undefined);

        setInterval(() => {
          triggerUpdateCheck();
        }, 60 * 60 * 1000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') triggerUpdateCheck();
        });

        window.addEventListener('online', () => {
          triggerUpdateCheck();
        });

        console.log('IMAM PWA: Service Worker Registered');
      })
      .catch((err) => console.log('IMAM PWA: Service Worker Registration Failed', err));
  });
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);