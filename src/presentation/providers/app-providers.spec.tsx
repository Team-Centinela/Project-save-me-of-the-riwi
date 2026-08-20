// presentation/providers/app-providers.spec.tsx
//
// Verifies the three responsibilities:
//   1. The children render inside the QueryClientProvider.
//   2. The error boundary catches a render error and shows the fallback.
//   3. The boundary's reset button recovers when the underlying error is gone.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from './app-providers';

const noop = (): void => undefined;

describe('AppProviders', () => {
  it('renders its children', () => {
    render(
      <AppProviders>
        <p>child content</p>
      </AppProviders>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders the error fallback when a child throws', () => {
    // Suppress the React error log noise from the deliberately-throwing child.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
    const Thrower = () => {
      throw new Error('boom');
    };

    render(
      <AppProviders>
        <Thrower />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('recovers when the underlying error is removed before "Try again"', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(noop);
    const user = userEvent.setup();

    // A controlled flag outside the React tree: react-error-boundary does
    // not remount its children on reset, so the throwing branch must be
    // cleared before the reset click — otherwise the boundary catches the
    // same error again.
    const controller = { shouldThrow: true };

    function Thrower() {
      if (controller.shouldThrow) throw new Error('boom');
      return <p>recovered</p>;
    }

    render(
      <AppProviders>
        <Thrower />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();

    controller.shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
