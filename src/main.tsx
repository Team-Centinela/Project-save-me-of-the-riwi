import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { env } from './config/env';
import { AppProviders } from './presentation/providers/app-providers';
import { router } from './presentation/routes/router';
import './index.css';

if (import.meta.env.DEV) {
  console.warn(`[cineteca] env validated against ${env.VITE_TMDB_API_BASE}`);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found.');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
