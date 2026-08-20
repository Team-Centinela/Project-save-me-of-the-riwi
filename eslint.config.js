import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import query from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';

// eslint-disable-next-line @typescript-eslint/no-deprecated --
// `tseslint.config()` is the canonical entry point in typescript-eslint 8.67.
// The migration target is `defineConfig()` from eslint core, but eslint 10.8.1
// does not yet export it. Revisit when eslint ^10.x ships defineConfig.
export default tseslint.config(
  // ── Ignores ───────────────────────────────────────────────────────────
  { ignores: ['dist', 'coverage', '*.config.{js,mjs,cjs}', 'eslint.config.js'] },

  // ── Base, no type checking (applies to .js and .ts) ──────────────────
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  query.configs['flat/recommended'],

  // ── Strict type checking, scoped to src/ ──────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ── Axios rule, catch-all across src/ ─────────────────────────────────
  // NOTE: flat config MERGES configs at the rule level — it does NOT replace
  // them. For `src/domain/**`, the effective `no-restricted-imports` rule
  // ends up with both `paths: [axios]` (from this catch-all) and `patterns:
  // [...]` (from the domain block below). ESLint reports the first match;
  // empirically patterns fires first when both could match, so:
  //   - `import 'axios'` in domain     → "Domain does not depend on frameworks." (patterns)
  //   - `import 'react'` in domain     → "Domain does not depend on frameworks." (patterns)
  //   - `import 'axios'` in src/other  → "Only src/infrastructure/http may…" (paths only)
  // The domain/application blocks below add their `patterns` on top of this
  // catch-all for the files they match.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infrastructure/http/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message: 'Only src/infrastructure/http may import axios.',
            },
          ],
        },
      ],
    },
  },

  // ── THE DEPENDENCY RULE ───────────────────────────────────────────────
  // The domain is pure TypeScript: it does not know React, the HTTP
  // library, the cache, or any outer layer. That is what makes it
  // testable without a single test double.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'axios', '@tanstack/*', 'react-hook-form'],
              message: 'Domain does not depend on frameworks.',
            },
            {
              group: ['@/presentation/*', '@/infrastructure/*', '@/application/*'],
              message: 'Dependencies point inward.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/presentation/*', '@/infrastructure/*'],
              message:
                'Application defines interfaces; infrastructure implements them, not the other way around.',
            },
            {
              group: ['axios', 'react', 'react-*'],
              message: 'Application does not know how the data travels.',
            },
          ],
        },
      ],
    },
  },

  // See PR #6 (Vitest config) — spec files will land there.
  { files: ['**/*.spec.{ts,tsx}'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  prettier, // always last: turns off whatever Prettier decides
);
