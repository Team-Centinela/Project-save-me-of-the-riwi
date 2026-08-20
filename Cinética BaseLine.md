# Cineteca — Línea base

**Del repositorio vacío al andamio en verde · sin una sola funcionalidad**

> **Qué es y qué no es.** Esta guía termina cuando el proyecto arranca, pasa el gate de calidad y **todavía no hace nada**. No hay dominio, no hay consumo de la API, no hay pantallas: eso pertenece a la guía del proyecto y empieza donde esta acaba. Aquí solo hay dependencias, archivos base, estilos, configuración y comandos.
>
> Se hace **una vez, entre todos, en la misma sesión**. Es media jornada. Que cada persona monte su propia línea base es la forma más rápida de tener cinco proyectos distintos el miércoles.

---

## Lo que van a tener al terminar

- [ ] `pnpm dev` sirve una pantalla vacía con el tema aplicado y cero errores en consola
- [ ] `pnpm check-types` en verde con TypeScript en modo severo
- [ ] `pnpm lint` en verde, con cero advertencias toleradas
- [ ] `pnpm test` en verde con una prueba de humo
- [ ] `bash scripts/verify.sh --full` en verde
- [ ] Un commit rechazado a propósito, para comprobar que el gate existe de verdad
- [ ] La estructura de carpetas creada y vacía, esperando el primer archivo del dominio
- [ ] La credencial de TMDB en `.env.local`, validada al arrancar, y **fuera** del repositorio

---

## Tres reglas antes de empezar

**El orden importa.** Cada paso asume el anterior. Saltarse el linter para "avanzar más rápido" significa reescribir archivos el jueves.

**Cada paso termina en un checkpoint.** Un comando que corren o algo que miran en pantalla. Si no pasa, no avanzan: en este stack los errores no se acumulan, se multiplican.

**Las versiones no se fijan de memoria.** Las de este documento se verificaron contra el registry de npm el **19 de agosto de 2026**. Una tabla de versiones es una foto; el registry es la verdad. Verifíquenlas antes de instalar y usen siempre la última estable que el resto del ecosistema soporte — nunca versiones de prueba (`beta`, `rc`, `canary`, `next`).

Todo comando se corre desde la raíz del proyecto salvo aviso.

---

## Paso 1 · Prerrequisitos

```bash
node -v            # el LTS activo; si no, instálenlo desde nodejs.org
corepack enable    # deja que el repositorio fije su gestor de paquetes
pnpm -v            # 11.22.0 al momento de escribir esto
git --version
```

`corepack` existe para que la versión de pnpm la mande el `package.json` y no la máquina de cada uno. Sin eso, un lockfile generado con otra versión produce el clásico "en mi máquina funciona".

En el editor, tres extensiones: **ESLint**, **Prettier** y **Tailwind CSS IntelliSense**, con *formatear al guardar* apuntando a Prettier. Que el editor y el gate digan lo mismo.

---

## Paso 2 · La credencial de TMDB

1. Crear una cuenta **de práctica** en `themoviedb.org` (no la personal de nadie).
2. Entrar a *Settings → API* y solicitar acceso. Piden un formulario de uso: declaren que es un proyecto educativo sin fines comerciales.
3. Al aprobarse hay dos credenciales. Copien la segunda, el **API Read Access Token**: sirve igual para las dos versiones de la API, así que hay un solo mecanismo en todo el código en vez de dos.

Checkpoint, antes de seguir:

```bash
export TMDB_TOKEN="eyJ...tu-read-access-token"
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $TMDB_TOKEN" \
  https://api.themoviedb.org/3/configuration
# Se espera: 200
```

Si sale `401`, el token está mal copiado — suelen colarse saltos de línea al pegar.

> **Asúmanlo desde ahora:** esta credencial va a acabar dentro del bundle y cualquiera puede leerla. Es de solo lectura, de una cuenta de práctica y rotable en un minuto desde el mismo panel. Eso la hace aceptable **aquí y solo aquí**.

---

## Paso 3 · Crear el proyecto

```bash
pnpm create vite@latest cineteca --template react-ts
cd cineteca
pnpm install
pnpm dev     # http://localhost:5173 debe cargar la plantilla
```

Limpien el andamio ahora, porque si no sobrevive hasta producción:

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

Dejen `src/App.tsx` con un `<h1>Cineteca</h1>` y nada más. `src/index.css` se vacía: en el paso 6 se convierte en el archivo de tokens del tema.

En `index.html`, dos detalles que después se olvidan: `lang="es"` en la etiqueta `html` y un `<title>` de verdad.

Fijen el toolchain y los scripts en `package.json`:

```jsonc
{
  "name": "cineteca",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.22.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check-types": "tsc --noEmit",
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "prepare": "husky"
  }
}
```

`--max-warnings 0` es una decisión de fondo, no un detalle: una advertencia que nadie arregla se multiplica hasta que el linter deja de informar. Aquí **una advertencia es un fallo**.

```bash
git init && git add -A && git commit -m "chore: scaffold vite + react + ts"
```

**Checkpoint:** `pnpm dev` sirve la página con el título y cero errores en consola.

---

## Paso 4 · TypeScript en modo severo

```bash
pnpm add -D typescript@6.0.3
```

**Por qué no la última (7.0.2).** `typescript-eslint@8.67.0` declara en sus dependencias de pares `typescript >=4.8.4 <6.1.0`. Con TypeScript 7, el linter con reglas de tipo deja de funcionar — y ese linter es quien va a imponer la arquitectura en el paso 7. Renunciar al linter para tener el compilador nuevo es un mal negocio. Dejen la nota para acordarse:

```
// TODO(upgrade): subir a TypeScript 7 cuando typescript-eslint admita >=7 en peerDependencies
```

En `tsconfig.app.json`, dentro de `compilerOptions`:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

| Bandera | Qué evita |
|---|---|
| `noUncheckedIndexedAccess` | Acceder al primer elemento de una lista vacía. Con la bandera, ese acceso es "el elemento **o** indefinido" y el compilador obliga a decidir qué pasa cuando no hay nada. La que atrapa más bugs reales en este proyecto |
| `exactOptionalPropertyTypes` | Que una propiedad opcional acepte el valor "indefinido" explícito. Al construir filtros esa diferencia decide si una clave de caché cambia o no |
| `noFallthroughCasesInSwitch` | Un caso sin corte que se cuela al siguiente |
| `verbatimModuleSyntax` | Imports de tipos que sobreviven al build; obliga a marcarlos como tipos |
| `noUnusedLocals` / `noUnusedParameters` | Código muerto acumulándose durante una semana de prisa |

TypeScript resuelve el alias `@/`, pero el empaquetador no se enteraría. Hay que decírselo también a Vite:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({ plugins: [react(), tsconfigPaths()] });
```

**Checkpoint:** `pnpm check-types` en verde. Comprueben que las banderas están vivas: declaren una lista vacía, accedan a su primer elemento y confirmen que el compilador se queja. Bórrenlo después.

---

## Paso 5 · Dependencias

### 5.1 Primero el verificador de versiones

```bash
mkdir -p scripts
```

```bash
# scripts/check-versions.sh
#!/usr/bin/env bash
# Compara lo instalado contra la última estable del registry y detecta paquetes
# deprecados. Con --gate sale con error si hay alguno (lo usa verify.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
GATE="${1:-}"
FAILED=0
deps=$(node -p "const p=require('./package.json');Object.keys({...p.dependencies,...p.devDependencies}).join('\n')")
printf '%-38s %-14s %-14s %s\n' PAQUETE INSTALADA ÚLTIMA ESTADO
while read -r dep; do
  [ -z "$dep" ] && continue
  installed=$(node -p "try{require('$dep/package.json').version}catch(e){'?'}" 2>/dev/null || echo '?')
  latest=$(pnpm view "$dep" version 2>/dev/null || echo '?')
  deprecated=$(pnpm view "$dep" deprecated 2>/dev/null || true)
  status="ok"
  [ -n "$deprecated" ] && { status="DEPRECADO"; FAILED=1; }
  [ "$installed" != "$latest" ] && [ "$status" = "ok" ] && status="hay $latest"
  printf '%-38s %-14s %-14s %s\n' "$dep" "$installed" "$latest" "$status"
done <<< "$deps"
if [ "$GATE" = "--gate" ] && [ "$FAILED" -ne 0 ]; then
  echo "✖ Hay dependencias deprecadas. Reemplácenlas por su sucesor documentado."; exit 1
fi
```

```bash
chmod +x scripts/check-versions.sh
```

### 5.2 Bloque A · Runtime

```bash
pnpm add react-router@8.3.0 @tanstack/react-query@5.101.4 axios@1.19.0 zod@4.4.3 \
  react-hook-form@7.85.0 @hookform/resolvers@5.9.1 @tanstack/react-virtual@3.14.10 \
  lucide-react@1.33.0 react-error-boundary@6.1.3 \
  clsx@2.1.1 tailwind-merge@3.6.0 class-variance-authority@0.7.1
```

Dos avisos que cuestan una hora si se descubren solos:

- **React Router 8 se importa desde `react-router`**, no desde `react-router-dom` — ese paquete se quedó en la línea 7. Si encuentran un tutorial con `react-router-dom`, es de la versión anterior.
- **`@hookform/resolvers` tiene que ser 5 o mayor** para hablar con Zod 4. Con la versión 3 y Zod 4, el conector falla con un error de tipos indescifrable.

### 5.3 Bloque B · Estilos

```bash
pnpm add -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
```

### 5.4 Bloque C · Pruebas

```bash
pnpm add -D vitest@4.1.11 @vitest/coverage-v8@4.1.11 jsdom@30.0.1 \
  @testing-library/react@16.3.2 @testing-library/user-event@14.6.5 \
  @testing-library/jest-dom@7.0.1 msw@2.15.0 axe-core@4.13.0 \
  vite-tsconfig-paths@6.1.1
```

`axe-core` va directo, sin envoltorio: los paquetes que lo envuelven para Vitest están sin mantenimiento, y el envoltorio son doce líneas propias. **La dependencia más pequeña que resuelve el problema.**

### 5.5 Bloque D · Calidad

```bash
pnpm add -D eslint@10.8.1 typescript-eslint@8.67.0 prettier@3.9.6 \
  eslint-config-prettier@10.1.8 eslint-plugin-react-hooks@7.1.1 \
  eslint-plugin-jsx-a11y@6.10.2 @tanstack/eslint-plugin-query@5.101.4 \
  globals@17.11.0 husky@9.1.7 lint-staged@17.3.0 \
  @tanstack/react-query-devtools@5.101.4
```

`eslint-plugin-jsx-a11y` no es decoración: es el único miembro del equipo que se acuerda de la accesibilidad a las once de la noche del día 6.

**Checkpoint:**

```bash
./scripts/check-versions.sh    # cero deprecados
pnpm check-types
git add -A && git commit -m "chore: add project dependencies"
```

---

## Paso 6 · Tailwind y los tokens del tema

Tailwind 4 es **CSS-first**: no hay archivo de configuración, no hay lista de rutas que mantener, y los tokens viven en el CSS.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({ plugins: [react(), tailwindcss(), tsconfigPaths()] });
```

```css
/* src/index.css — el contrato de diseño del proyecto */
@import "tailwindcss";

@theme {
  /* Superficies y texto: nombres semánticos, jamás descriptivos */
  --color-surface:        oklch(0.16 0.02 265);
  --color-surface-raised: oklch(0.21 0.02 265);
  --color-ink:            oklch(0.97 0.01 265);
  --color-ink-muted:      oklch(0.72 0.02 265);
  --color-brand:          oklch(0.72 0.17 152);
  --color-danger:         oklch(0.63 0.20 25);

  /* Estados del catálogo: si mañana cambia el ámbar, se toca UNA línea */
  --color-status-released:   oklch(0.72 0.17 152);
  --color-status-unreleased: oklch(0.80 0.15 85);
  --color-status-unknown:    oklch(0.60 0.02 265);

  /* La valoración tiene su propio nivel tipográfico */
  --text-rating: 1.375rem;
  --text-rating--line-height: 1.1;

  /* Área táctil mínima con nombre, para que nadie escriba 44px suelto */
  --spacing-touch: 2.75rem;
  --radius-card:   0.75rem;
  --aspect-poster: 2 / 3;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tres reglas que nacen aquí y rigen todo el proyecto:

- **Los valores literales de color viven solo en `@theme`.** Un color escrito a mano dentro de un componente es una fuga del contrato de diseño.
- **Los nombres son semánticos.** `status-unreleased` comunica intención; `amber-500` solo comunica color.
- **Las clases se fusionan con una utilidad, nunca concatenando cadenas.** Creen un archivo `src/presentation/lib/cn.ts` que combine `clsx` con `tailwind-merge` y expórtenlo como `cn`: son dos líneas y evitan el bug silencioso más común del stack — dos paddings en la misma cadena, gana uno de los dos y nadie sabe cuál.

Asegúrense de que `src/main.tsx` importa `./index.css`.

**Checkpoint:** un elemento con `bg-surface text-ink min-h-touch rounded-card` se ve con los colores del tema. Si sale sin estilo, falta el plugin en `vite.config.ts` o el `@import` en el CSS.

---

## Paso 7 · ESLint y Prettier

Este archivo es el que convierte "Clean Architecture" de un diagrama en una regla ejecutable. Va en **JavaScript** (`eslint.config.js`): la configuración en TypeScript necesita un cargador extra y no vale la pena en la línea base.

```js
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import query from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  reactHooks.configs['recommended-latest'],
  jsxA11y.flatConfigs.recommended,
  query.configs['flat/recommended'],

  {
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

  // ── LA REGLA DE DEPENDENCIA ───────────────────────────────────────────
  // El dominio es TypeScript puro: no conoce React, ni la librería HTTP, ni
  // la caché, ni las capas de fuera. Eso es lo que lo vuelve testeable sin
  // un solo doble de prueba.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['react', 'react-*', 'axios', '@tanstack/*', 'react-hook-form'],
            message: 'El dominio no depende de frameworks.' },
          { group: ['@/presentation/*', '@/infrastructure/*', '@/application/*'],
            message: 'Las dependencias apuntan hacia dentro.' },
        ],
      }],
    },
  },
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/presentation/*', '@/infrastructure/*'],
            message: 'La aplicación define interfaces; la infraestructura las implementa, no al revés.' },
          { group: ['axios', 'react', 'react-*'],
            message: 'La aplicación no sabe cómo viajan los datos.' },
        ],
      }],
    },
  },
  // La librería HTTP existe en UN solo directorio. Si aparece en otro, el
  // transporte dejó de ser sustituible.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infrastructure/http/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: 'Solo src/infrastructure/http puede importar axios.' }],
      }],
    },
  },

  { files: ['**/*.spec.{ts,tsx}'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } },
  prettier,   // último siempre: apaga lo que Prettier decide
);
```

```json
// .prettierrc.json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

### Checkpoint · La demostración de 60 segundos

```bash
mkdir -p src/domain/shared
echo "import { useState } from 'react'; export const x = useState;" > src/domain/shared/bad.ts
pnpm lint    # debe FALLAR: "El dominio no depende de frameworks"
rm src/domain/shared/bad.ts
pnpm lint    # debe pasar
```

Háganlo de verdad, todos, mirando la pantalla. Una regla de arquitectura que solo vive en un diagrama se rompe el jueves; una que vive en el linter y en el CI, no.

---

## Paso 8 · Vitest, Testing Library y MSW

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts', 'src/test/**'],
      // Los umbrales se activan en el paso del dominio, cuando ya haya código
      // propio que cubrir. Encenderlos con el andamio vacío solo enseña a
      // negociar con el gate.
      // thresholds: {
      //   lines: 80, functions: 80, branches: 80, statements: 80,
      //   'src/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      // },
    },
  },
});
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './src/test/msw/server';

// onUnhandledRequest: 'error' es la línea que hace útil a MSW: una petición que
// nadie simuló revienta el test en vez de irse a la red de verdad.
beforeAll(() => { server.listen({ onUnhandledRequest: 'error' }); });
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => { server.close(); });

// jsdom no implementa ninguno de los dos, y el tema y el virtualizador los piden.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })),
});
globalThis.ResizeObserver = class {
  observe() {} unobserve() {} disconnect() {}
} as unknown as typeof ResizeObserver;
```

```ts
// src/test/msw/server.ts
import { setupServer } from 'msw/node';

// Arranca sin simulaciones a propósito: cada una se añade con la funcionalidad
// que la necesita, con respuestas reales de la API como base.
export const server = setupServer();
```

**Checkpoint:** escriban una única prueba de humo que monte el esqueleto de la app y compruebe que aparece el encabezado. `pnpm test` en verde.

---

## Paso 9 · La estructura de carpetas

```bash
mkdir -p \
  src/domain/shared \
  src/application/ports \
  src/infrastructure/{http,api,storage} \
  src/presentation/{routes,components/{ui,feature},hooks,providers,copy,lib} \
  src/config src/test/msw
```

Las carpetas quedan vacías. La duda real de la semana no es qué carpetas hay, sino **dónde va este archivo**:

| Lo que están escribiendo | Va en |
|---|---|
| Una regla de negocio, un estado, un formateador | `domain/` |
| La interfaz de "algo que trae datos" o "algo que los guarda" | `application/ports/` |
| La llamada a la red con su validación | `infrastructure/api/` |
| El cliente HTTP y sus interceptores | `infrastructure/http/` |
| El acceso al almacenamiento del navegador | `infrastructure/storage/` |
| Un hook de datos, un componente, una ruta | `presentation/` |
| Un texto visible por el usuario | `presentation/copy/` |

**Regla de bolsillo:** si un archivo de `domain/` necesitara instalar algo para funcionar, está en la carpeta equivocada.

---

## Paso 10 · La configuración, validada

El entorno es un borde no confiable como cualquier otro: si falta una variable, la app tiene que morir **al arrancar**, con un mensaje claro, y no tres pantallas después con un error de autorización inexplicable.

```ts
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_TMDB_READ_TOKEN: z.string().min(40, 'Falta el API Read Access Token de TMDB'),
  VITE_TMDB_API_BASE: z.string().url().default('https://api.themoviedb.org'),
  VITE_TMDB_IMAGE_BASE: z.string().url().default('https://image.tmdb.org/t/p'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Configuración inválida:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
```

```bash
# .env.example   (SÍ se commitea)
VITE_TMDB_READ_TOKEN=pon-aqui-tu-api-read-access-token
```

```bash
# .env.local     (NUNCA se commitea)
VITE_TMDB_READ_TOKEN=eyJ...
```

```bash
printf '\n.env.local\n.env*.local\ncoverage\n' >> .gitignore
```

**El prefijo `VITE_` es una advertencia, no burocracia:** Vite solo expone al cliente las variables con ese prefijo, precisamente para que nadie filtre un secreto por accidente. Que su credencial lo lleve significa que es pública.

**Checkpoint:** borren la variable de `.env.local`, corran `pnpm dev` y confirmen que la app muere con el mensaje en español. Devuélvanla.

---

## Paso 11 · El esqueleto de la aplicación

Cuatro archivos base, sin ninguna funcionalidad dentro:

| Archivo | Qué contiene |
|---|---|
| `src/main.tsx` | El punto de entrada: importa el CSS, monta React en modo estricto y envuelve la app en los proveedores |
| `src/presentation/providers/app-providers.tsx` | El proveedor de la caché de datos y el límite de errores de render. Las opciones por defecto de la caché **se dejan para el paso de la capa de datos**: aquí solo se monta |
| `src/presentation/routes/router.tsx` | El enrutador con una ruta raíz, un contenedor común y una ruta de "no encontrado". Vacías |
| `src/presentation/routes/root-layout.tsx` | La cabecera, el pie con la atribución a TMDB y el hueco donde se pintarán las páginas |

Tres decisiones que se toman ahora y no se discuten después:

- **React en modo estricto**, desde el principio. Descubrir en el día 5 que un efecto se ejecuta dos veces es un mal día; descubrirlo hoy no cuesta nada.
- **Un límite de errores de render** desde el primer commit. Un error suelto no puede dejar la pantalla en blanco, y en desarrollo el mensaje ahorra tiempo.
- **La atribución a TMDB en el pie, ya.** Los términos de uso de la API exigen mostrar el logo y la frase correspondiente. Es la licencia bajo la que consumen el servicio, no un detalle estético — y puesta el primer día, no se olvida el último.

Añadan también las devtools de la caché, condicionadas a que la app corra en desarrollo. Ver la caché en vivo vale un día entero de depuración más adelante.

**Checkpoint:** `pnpm dev` sirve el esqueleto con cabecera y pie, la ruta inexistente muestra la pantalla de "no encontrado", y la consola está limpia.

---

## Paso 12 · El gate

```bash
# scripts/verify.sh
#!/usr/bin/env bash
# =============================================================================
# verify.sh — EL gate de calidad.
# Contrato: exit 0 ⇒ formato + linter sin advertencias + tipos estrictos +
#           pruebas verdes + build + sin dependencias deprecadas.
# Lo usan: .husky/pre-commit (--quick), .husky/pre-push (--full) y el CI (--full).
# Nunca se saltea y nunca se debilita un paso "para que pase": se arregla el código.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:---full}"
case "$MODE" in --quick|--full) ;; *) echo "uso: verify.sh [--quick|--full]"; exit 2 ;; esac

BLUE='\033[1;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
step() { printf '\n%b▶ %s%b\n' "$BLUE" "$1" "$NC"; }
fail() { printf '\n%b✖ GATE EN ROJO — %s%b\n' "$RED" "$1" "$NC"; exit 1; }
START=$(date +%s)

step "[1/5] Formato — Prettier"
pnpm format:check || fail "hay archivos sin formatear (corran: pnpm format)"

step "[2/5] Linter — ESLint, cero advertencias"
pnpm lint || fail "el linter encontró problemas"

step "[3/5] Tipos — tsc --noEmit"
pnpm check-types || fail "errores de tipos"

if [ "$MODE" = "--quick" ]; then
  printf '\n%b✔ GATE RÁPIDO EN VERDE en %ss%b\n' "$GREEN" "$(( $(date +%s) - START ))" "$NC"; exit 0
fi

step "[4/5] Pruebas — Vitest"
pnpm test || fail "pruebas rojas o cobertura por debajo del umbral"

step "[5/5] Build de producción"
pnpm build || fail "el build falló"

bash scripts/check-versions.sh --gate || fail "hay una dependencia deprecada"

printf '\n%b✔ GATE COMPLETO EN VERDE en %ss%b\n' "$GREEN" "$(( $(date +%s) - START ))" "$NC"
```

```bash
chmod +x scripts/verify.sh
pnpm dlx husky init
printf 'pnpm lint-staged\nbash scripts/verify.sh --quick\n' > .husky/pre-commit
printf 'bash scripts/verify.sh --full\n'                     > .husky/pre-push
```

```jsonc
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

`lint-staged` arregla y formatea **los archivos del commit**; `verify.sh --quick` comprueba **el proyecto entero**. Son cosas distintas y por eso están los dos.

**Presupuesto de tiempo:** el gate rápido por debajo de 10 s, el completo por debajo de 90 s. Si el gate rápido tarda medio minuto, alguien va a saltárselo el viernes por la noche y ahí lo perdieron. Si se pone lento, se arregla la causa; **no se quitan pasos**.

```yaml
# .github/workflows/ci.yml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: bash scripts/verify.sh --full
        env:
          VITE_TMDB_READ_TOKEN: ${{ secrets.VITE_TMDB_READ_TOKEN }}
```

El CI corre **el mismo archivo** que sus hooks: es la única forma de que local y CI no puedan separarse. Protejan `main` exigiendo este job.

**Checkpoint, el más importante de la guía:** intenten commitear una variable con tipo `any`. El commit debe ser rechazado. Ese "no" es el producto de todo el paso.

---

## Paso 13 · Cerrar la línea base

```bash
bash scripts/verify.sh --full
git add -A && git commit -m "chore: project baseline — tooling, theme, tests and quality gate"
git push -u origin main
```

Un `README.md` corto, que un extraño pueda seguir sin preguntarles nada: qué es el proyecto, requisitos, cómo obtener la credencial de TMDB, `pnpm install`, crear `.env.local`, `pnpm dev`, cómo correr las pruebas y el gate, y la atribución a TMDB.

Repasen la lista del principio de este documento. Si las ocho casillas están marcadas, la línea base está terminada y **empieza el proyecto**: el primer archivo que se escribe es del dominio, y ese día no se pinta ninguna pantalla.

---

## Comandos de referencia rápida

```bash
pnpm dev                          # servidor de desarrollo
pnpm test:watch                   # pruebas en vivo mientras escriben
pnpm test                         # pruebas + cobertura (lo que corre el gate)
pnpm lint                         # linter, cero advertencias
pnpm check-types                  # tipos
pnpm format                       # formatear
bash scripts/verify.sh --quick    # lo que corre en cada commit
bash scripts/verify.sh --full     # lo que corre antes de cada push y en el CI
./scripts/check-versions.sh       # versiones y deprecaciones
pnpm build && pnpm preview        # build de producción, servido para medir
```

---

## Solución de problemas de la línea base

| Síntoma | Causa | Arreglo |
|---|---|---|
| `401` al probar la credencial | Token mal copiado o mandado como clave de v3 | Bearer, y revisen saltos de línea al pegar |
| Las clases de Tailwind no aplican | Falta el plugin o el `@import` | Plugin en `vite.config.ts` y `@import "tailwindcss"` en `src/index.css` |
| El linter con reglas de tipo no corre | TypeScript 7 con `typescript-eslint` 8 | Fijen TypeScript 6.0.3 (paso 4) |
| ESLint no encuentra el proyecto de TS | Falta `projectService` o el directorio raíz | Bloque `languageOptions.parserOptions` del paso 7 |
| El alias `@/` falla en las pruebas | Falta el plugin de rutas en la config de Vitest | `vite-tsconfig-paths` en `vitest.config.ts` |
| `matchMedia is not a function` | jsdom no lo implementa | El stub del `vitest.setup.ts` (paso 8) |
| `ResizeObserver is not defined` | Igual | Mismo archivo |
| MSW: `request not handled` | No hay simulación para esa URL | Añádanla. El error es la característica, no el fallo |
| Los hooks de git no se ejecutan | Falta el script `prepare` o `husky init` | Paso 3 y paso 12; después, `pnpm install` otra vez |
| El gate falla por cobertura con el proyecto vacío | Los umbrales están activados antes de tiempo | Siguen comentados hasta el paso del dominio (paso 8) |
| `pnpm` no es la versión esperada | Corepack deshabilitado | `corepack enable` y `packageManager` en `package.json` |

---

*Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.*
