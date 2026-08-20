import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { env } from './config/env';
import './index.css';
import App from './App.tsx';

if (import.meta.env.DEV) {
  console.warn(`[cineteca] env validated against ${env.VITE_TMDB_API_BASE}`);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
