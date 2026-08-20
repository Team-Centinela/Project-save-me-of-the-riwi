// presentation/routes/router.spec.tsx
//
// Verifies the route tree wires the root layout, the index route, and a
// wildcard that catches unknown URLs.

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { copy } from '../copy/strings';
import { router } from './router';

function renderRouterAt(path: string) {
  // Same route shape as `router`, but rebuilt on a memory history so the test
  // can drive navigation without touching the browser URL.
  const routes = router.routes as RouteObject[];
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={memoryRouter} />);
}

describe('router', () => {
  it('renders the home page through the root layout at "/"', () => {
    renderRouterAt('/');
    expect(screen.getByRole('heading', { name: /trending this week/i })).toBeInTheDocument();
    expect(screen.getByText(/not endorsed or certified by TMDB/i)).toBeInTheDocument();
  });

  it('renders the NotFoundPage for any unknown route', () => {
    renderRouterAt('/no-such-page');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('keeps the root layout chrome even on the 404 page', () => {
    renderRouterAt('/no-such-page');
    // The header brand link is rendered by the layout, not the 404 page.
    expect(screen.getByRole('link', { name: copy.brand })).toBeInTheDocument();
    // The TMDB attribution is in the footer.
    expect(screen.getByText(/not endorsed or certified by TMDB/i)).toBeInTheDocument();
  });
});
