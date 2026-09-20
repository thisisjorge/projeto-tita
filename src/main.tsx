import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { serviceWorkerManager } from './services/service-worker-manager.js';
import { applyTheme, readTheme } from './ui/theme.js';

applyTheme(readTheme());

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Register service worker in browser environments
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  serviceWorkerManager.register().catch((err) => {
    console.warn('[PWA] Service Worker registration failed:', err);
  });
}
