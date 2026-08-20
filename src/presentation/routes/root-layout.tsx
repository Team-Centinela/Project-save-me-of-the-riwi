// presentation/routes/root-layout.tsx — the chrome that wraps every route.
//
// Three locked-in decisions live here:
//   1. <header> exposes the brand and primary navigation.
//   2. <Outlet/> renders the matched child route — nothing more.
//   3. <footer> carries the TMDB attribution required by TMDB's terms of use.
//
// The "skip to content" link is the first interactive element on the page so
// keyboard users can bypass the navigation without tabbing through it.

import { Link, Outlet } from 'react-router';
import { copy } from '../copy/strings';

const NAV_ITEMS = [
  { to: '/', label: copy.nav.home },
  { to: '/explore', label: copy.nav.explore },
  { to: '/search', label: copy.nav.search },
  { to: '/my-cineteca', label: copy.nav.myCineteca },
] as const;

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-surface"
      >
        {copy.nav.skipToContent}
      </a>

      <header className="border-b border-surface-raised">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight text-brand"
            aria-label={copy.brand}
          >
            {copy.brand}
          </Link>
          <nav aria-label={copy.nav.primary}>
            <ul className="flex items-center gap-4 text-sm text-ink-muted sm:gap-6">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="rounded-sm transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-surface-raised">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noreferrer noopener"
            aria-label={copy.footer.tmdbLinkLabel}
            className="rounded-sm underline-offset-2 hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-brand hover:underline"
          >
            {copy.footer.tmdbAttribution}
          </a>
          <p>{copy.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
