// presentation/routes/not-found-page.spec.tsx

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { formatViolations, runAxe } from '@/test/axe';
import { NotFoundPage } from './not-found-page';

function renderNotFound() {
  const router = createMemoryRouter([{ path: '*', Component: NotFoundPage }], {
    initialEntries: ['/does-not-exist'],
  });
  return render(<RouterProvider router={router} />);
}

describe('NotFoundPage', () => {
  it('renders a heading that announces the missing page', () => {
    renderNotFound();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('offers a way back to the home page', () => {
    renderNotFound();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });

  it('has no axe-core violations', async () => {
    const { container } = renderNotFound();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    const violations = await runAxe(container);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
