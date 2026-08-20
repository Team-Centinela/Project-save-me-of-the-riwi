// presentation/routes/not-found-page.tsx — the 404 page.
//
// Renders for any path that did not match a defined route. It is reachable
// through the router's wildcard ("*") child of the root layout.

import { Link } from 'react-router';
import { copy } from '../copy/strings';

export function NotFoundPage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex max-w-md flex-col items-center py-16 text-center"
    >
      <p className="font-mono text-sm text-ink-muted">404</p>
      <h1 id="not-found-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {copy.notFound.title}
      </h1>
      <p className="mt-4 text-sm text-ink-muted">{copy.notFound.description}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {copy.notFound.homeCta}
      </Link>
    </section>
  );
}
