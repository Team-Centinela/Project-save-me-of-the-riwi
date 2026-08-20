// presentation/providers/app-providers.tsx — top-level providers for the app.
//
// Three responsibilities, on purpose:
//   1. QueryClient — owns server state for the entire tree.
//   2. ErrorBoundary — a render error cannot blank the screen.
//   3. ReactQueryDevtools — mounted only in dev, never in the production bundle.
//
// StrictMode is applied at the entry point (main.tsx), not here: it must wrap
// every render, including the boundary's reset, which only happens when the
// boundary lives inside the tree.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary, type ErrorBoundaryProps } from 'react-error-boundary';
import { copy } from '../copy/strings';

const ONE_MINUTE_MS = 60_000;

function ErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto my-16 max-w-md rounded-card border border-danger/40 bg-surface-raised p-6 text-center"
    >
      <h2 className="text-xl font-semibold text-ink">{copy.errors.boundaryTitle}</h2>
      <p className="mt-2 text-sm text-ink-muted">{copy.errors.boundaryDescription}</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-surface"
      >
        {copy.errors.retry}
      </button>
    </div>
  );
}

const errorBoundaryProps: ErrorBoundaryProps = {
  FallbackComponent: ErrorFallback,
};

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ONE_MINUTE_MS,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  // `useState` ensures a fresh client per mount; React 19 StrictMode would
  // otherwise create two QueryClient instances in dev and split the cache.
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary {...errorBoundaryProps}>
      <QueryClientProvider client={queryClient}>
        {children}
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
