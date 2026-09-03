import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Polyfill Promise.withResolvers for mobile browsers (iOS Safari < 17.4, Chrome < 119)
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers === 'undefined') {
  (Promise as unknown as { withResolvers: () => { promise: Promise<unknown>; resolve: (v: unknown) => void; reject: (r: unknown) => void } }).withResolvers = function () {
    let resolve!: (v: unknown) => void;
    let reject!: (r: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Ensure any stale Service Worker is unregistered to avoid blank white screens on mobile
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


