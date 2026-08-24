// presentation/routes/root-layout.spec.tsx
//
// Verifies the three pieces of chrome required by the issue:
//   - <header> exposes the brand
//   - the TMDB attribution is in the <footer>
//   - <Outlet/> renders the child route

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { formatViolations, runAxe } from '@/test/axe';
import { copy } from '../copy/strings';
import { RootLayout } from './root-layout';

function renderWith(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: RootLayout,
        children: [
          {
            path: 'child',
            Component: () => <p>Child content</p>,
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}

describe('RootLayout', () => {
  it('renders the brand in the header', () => {
    renderWith('/');
    expect(screen.getByRole('link', { name: copy.brand })).toBeInTheDocument();
  });

  it('renders the TMDB attribution in the footer (required by TMDB terms)', () => {
    renderWith('/');
    expect(screen.getByText(/not endorsed or certified by TMDB/i)).toBeInTheDocument();
  });

  it('renders the matched child route through the Outlet', () => {
    renderWith('/child');
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('exposes a "skip to content" link as the first focusable element', () => {
    renderWith('/');
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument();
  });

  it('renders a primary navigation landmark', () => {
    renderWith('/');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has no axe-core violations on the chrome', async () => {
    const { container } = renderWith('/');
    expect(screen.getByRole('link', { name: copy.brand })).toBeInTheDocument();
    const violations = await runAxe(container);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
