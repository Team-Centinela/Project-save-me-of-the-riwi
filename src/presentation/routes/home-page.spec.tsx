// presentation/routes/home-page.spec.tsx

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders its heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /trending this week/i })).toBeInTheDocument();
  });
});
