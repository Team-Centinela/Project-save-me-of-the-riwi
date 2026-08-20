/* eslint-disable @typescript-eslint/no-deprecated --
 * `tseslint.config()` is the canonical entry point in typescript-eslint 8.67.
 * The migration target is `defineConfig()` from eslint core, but eslint 10.8.1
 * does not yet export it. Revisit when eslint ^10.x ships defineConfig.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import query from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // ── Ignores ──────────────────────────────────────────────────────────
  { ignores: ['dist', 'coverage', '*.config.{js,mjs,cjs}', 'eslint.config.js'] },

  // ── Base, sin chequeo de tipos (aplica a .js y .ts) ─────────────────
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  query.configs['flat/recommended'],

  // ── Chequeo estricto de tipos, solo para src/ ─────────────────────────
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

  // ── Regla de axios, catch-all en src/ ─────────────────────────────────
  // Aparece ANTES que las reglas de domain/application porque flat config
  // resuelve conflictos de la misma regla por ORDEN (no por especificidad
  // del glob). Las reglas más específicas debajo sobreescriben esta.
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
              message: 'Solo src/infrastructure/http puede importar axios.',
            },
          ],
        },
      ],
    },
  },

  // ── LA REGLA DE DEPENDENCIA ───────────────────────────────────────────
  // El dominio es TypeScript puro: no conoce React, ni la librería HTTP, ni
  // la caché, ni las capas de fuera. Eso es lo que lo vuelve testeable sin
  // un solo doble de prueba.
  // NOTA: el orden importa — este bloque va DESPUÉS del catch-all de axios
  // para que su `no-restricted-imports` lo sobreescriba en src/domain/**.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'axios', '@tanstack/*', 'react-hook-form'],
              message: 'El dominio no depende de frameworks.',
            },
            {
              group: ['@/presentation/*', '@/infrastructure/*', '@/application/*'],
              message: 'Las dependencias apuntan hacia dentro.',
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
                'La aplicación define interfaces; la infraestructura las implementa, no al revés.',
            },
            {
              group: ['axios', 'react', 'react-*'],
              message: 'La aplicación no sabe cómo viajan los datos.',
            },
          ],
        },
      ],
    },
  },

  { files: ['**/*.spec.{ts,tsx}'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  prettier, // último siempre: apaga lo que Prettier decide
);
