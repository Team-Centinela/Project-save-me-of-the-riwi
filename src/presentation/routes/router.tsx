// presentation/routes/router.tsx — the route tree.
//
// One root route renders the RootLayout for every URL. The layout owns the
// <header>, the <Outlet/>, and the <footer> with the TMDB attribution.
//
// Children today:
//   - `/`         → HomePage. Real content lands in a follow-up issue.
//   - `/explore`  → ExplorePage. The filtered grid of all movies.
//   - `*`         → NotFoundPage. Any path that does not match a defined
//                   route renders here, inside the same chrome as the
//                   rest of the app.

import { createBrowserRouter } from 'react-router';
import { ExplorePage } from './explore-page';
import { HomePage } from './home-page';
import { NotFoundPage } from './not-found-page';
import { RootLayout } from './root-layout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'explore', Component: ExplorePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
