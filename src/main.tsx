import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './lib/logger';
import { PermissionProvider } from './contexts/PermissionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PermissionProvider>
      <App />
    </PermissionProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      logger.error('SERVICEWORKER_REGISTRATION_FAILED', { error: error instanceof Error ? error.message : String(error) });
    });
  });
}
