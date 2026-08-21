// presentation/routes/router.tsx — the route tree.
//
// One root route renders the RootLayout for every URL. The layout owns the
// <header>, the <Outlet/>, and the <footer> with the TMDB attribution.
//
// Children today:
//   - `/`             → HomePage. Weekly trending + CTA to explore.
//   - `/explore`      → ExplorePage. The filtered grid of all movies.
//   - `/search`       → SearchPage. Free-text search with debounce.
//   - `/movie/:id`    → MovieDetailPage. Shareable detail screen.
//   - `/my-cineteca`  → LibraryPage. The user's local library.
//   - `*`             → NotFoundPage. Any path that does not match a
//                       defined route renders here, inside the same
//                       chrome as the rest of the app.

import { createBrowserRouter } from 'react-router';
import { ExplorePage } from './explore-page';
import { HomePage } from './home-page';
import { LibraryPage } from './library-page';
import { MovieDetailPage } from './movie-detail-page';
import { NotFoundPage } from './not-found-page';
import { RootLayout } from './root-layout';
import { SearchPage } from './search-page';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'explore', Component: ExplorePage },
      { path: 'search', Component: SearchPage },
      { path: 'movie/:id', Component: MovieDetailPage },
      { path: 'my-cineteca', Component: LibraryPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
