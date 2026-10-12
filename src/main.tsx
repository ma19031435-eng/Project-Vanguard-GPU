import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Surface async failures (WebGPU init, PeerJS, audio) in the console with context instead of silently dying.
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Vanguard] Unhandled promise rejection:', e.reason);
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
