import { setupServer } from 'msw/node';

// Starts empty on purpose: every handler is added alongside the feature
// that needs it, with real API responses as the baseline.
export const server = setupServer();
