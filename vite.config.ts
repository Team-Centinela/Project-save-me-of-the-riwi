import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// The deploy target is GitHub Pages, which serves project sites
// under https://<org>.github.io/<repo>/ — every asset URL must be
// prefixed with the repo path or the deployed app loads blank.
//
// The base therefore comes from the environment instead of being
// hardcoded:
//
//   - dev server / CI gate / local preview → default '/' (unset).
//   - the Pages workflow sets CINETECA_BASE_PATH to
//     '/<repo>/' so the built bundle references its assets
//     through absolute, base-prefixed URLs.
//
// Client-side routing keeps working because React Router reads
// the pathname; the base only affects where static assets are
// fetched from.
const basePath = process.env.CINETECA_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
