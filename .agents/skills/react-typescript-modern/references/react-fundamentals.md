# React fundamentals (19.2+) in Cineteca

These notes are calibrated to the versions pinned in `package.json` and to the architecture the linter enforces. For project-level context, see the [Project Guide](https://gist.github.com/xXAreizaXx/16cb8c169ab015adb0be35fac4992863) and [`docs/architecture.md`](../../../docs/architecture.md).

## Components and props

Write function components with an explicit props type. Do not reach for `React.FC` — it implicitly adds `children` to every component whether or not it accepts them, and it makes generic components awkward to type. A plain typed function is clearer:

```tsx
type MovieCardProps = {
  title: string;
  year: number;
  onSelect?: (id: string) => void;
};

function MovieCard({ title, year, onSelect }: MovieCardProps) {
  return (
    <button onClick={() => onSelect?.(title)}>
      {title} — {year}
    </button>
  );
}
```

If a file in `src/presentation/` already uses `React.FC` consistently, match its style — this is a preference, not a correctness issue.

> **Architecture reminder:** components live in `src/presentation/`. Anything reusable that does not import React belongs in `src/domain/` (entities, formatters) or `src/application/ports/` (interfaces).

## APIs that were removed, not just discouraged

These will actually fail (silently ignored, or throw an error) on a current install — worth knowing the difference between "old-fashioned but works" and "removed."

**`propTypes`** — silently ignored now. Migrate to TypeScript types.

```tsx
// Before
Heading.propTypes = { text: PropTypes.string };
Heading.defaultProps = { text: 'Hello' };

// After
type HeadingProps = { text?: string };
function Heading({ text = 'Hello' }: HeadingProps) {
  return <h1>{text}</h1>;
}
```

**Legacy Context** (`contextTypes` / `getChildContext` on class components) — removed. Use `createContext` + `useContext` (or `<Context value={...}>` — the `.Provider` wrapper is no longer required as of React 19, `<Context>` itself works as the provider).

**String refs** (`ref="thing"`) — removed. Use `useRef()` or a callback ref.

**`ReactDOM.render` / `ReactDOM.hydrate`** — removed. Use `createRoot(container).render(...)` / `hydrateRoot(container, ...)`.

**`ReactDOM.unmountComponentAtNode`** — removed. Use `root.unmount()`.

**`ReactDOM.findDOMNode`** — removed. Use a ref on the element you actually need.

**`react-test-renderer`** — deprecated (logs warnings; switched to concurrent rendering). Only the `react-test-renderer/shallow` subpath was actually removed in React 19; the rest of the package still resolves but prints a deprecation warning on import. Use `@testing-library/react` instead (see Testing below).

## `ref` as a prop

React 19 made `ref` an ordinary prop, so `forwardRef` is no longer needed for the common case of "let a parent attach a ref to my root element":

```tsx
type InputProps = { label: string; ref?: React.Ref<HTMLInputElement> };

function TextInput({ label, ref }: InputProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}
```

`forwardRef` still works and nothing breaks if you see it in an existing codebase — it is on a deprecation path, not removed. Do not reach for it in new code, and do not bother rewriting working `forwardRef` components just to modernize them unless you are already touching that file for another reason.

## Data fetching: do not reach for `useEffect` first

A `useEffect` + `useState` fetch is the most common stale pattern in generated React code, and it reintroduces problems (races between fast unmount and slow response, no caching, no dedup, no retry) that are solved by tools written for this.

In Cineteca the rule is firmer than "prefer TanStack Query":

- Server state goes through `@tanstack/react-query` — see `references/data-fetching-react-query.md`.
- View state lives in the URL (`useSearchParams`, route `loader` data).
- Form values before submission live in `react-hook-form`.
- Persistent user data (the library) lives in its own validated module under `src/infrastructure/storage/`.

Reserve `useEffect` for genuinely client-side concerns: subscriptions, syncing with a non-React widget, `document.title`, etc.

## Actions and forms

React 19's Actions are the current way to handle a pending mutation with built-in pending/error state. They replace the old "local `isSubmitting` state + manual `preventDefault`" pattern for anything beyond the most trivial form:

```tsx
import { useActionState } from 'react';

function ProfileForm({ userId }: { userId: string }) {
  const [error, submitAction, isPending] = useActionState(
    async (_prevState: string | null, formData: FormData) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        body: formData,
      });
      if (!res.ok) return 'Could not save your profile.';
      return null;
    },
    null,
  );

  return (
    <form action={submitAction}>
      <input name="displayName" />
      <button disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
```

For Cineteca specifically: forms that submit to TMDB through our own client usually go through React Router's `<Form>` + route `action` (see `references/routing-react-router.md`) **or** through React Hook Form + a Zod resolver + `useMutation`. Pick the one that matches where the data lives. Plain Actions are fine for forms that hit a backend we do not own.

Related hooks:

- **`useFormStatus()`** — read the pending state of the nearest parent `<form>` from a child component (e.g. a reusable `<SubmitButton>`), without prop-drilling `isPending`.
- **`useOptimistic()`** — show an optimistic value immediately while an action is in flight, then reconcile with the real result.

For a form that is genuinely just local UI state with no submission (a filter input, a search box), plain `useState` is still correct — do not force Actions onto things that are not submitting anywhere.

## `use()` for promises and context

`use()` reads a promise or a context value, and — unlike hooks — it can be called conditionally or in a loop:

```tsx
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise); // suspends until resolved
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.text}</li>
      ))}
    </ul>
  );
}
```

The promise must be created or cached **outside** render (module scope, a ref, a cache like React Query's) — a fresh promise created inline on every render never resolves from the component's point of view, so the Suspense fallback never clears. This is the same rule that makes `useSuspenseQuery` from TanStack Query a natural fit for `use()`-adjacent patterns.

## The React Compiler — check before you hand-memoize

The React Compiler (stable since October 2025) auto-memoizes components and values, which makes a lot of manual `useMemo`/`useCallback`/`React.memo` unnecessary — but only in projects that have actually enabled it.

Cineteca does **not** currently enable the React Compiler (the Vite template used is `react-ts`, not `react-compiler-ts`). Until `vite.config.ts` adds the compiler plugin and the linter is wired to enforce its rules, manual memoization is still doing real work:

- **Compiler not enabled (current state):** keep `useMemo` for expensive computations and `useCallback`/`React.memo` for props passed to expensive child components — just do not sprinkle them reflexively on everything. Unnecessary memoization adds overhead and complexity without helping.
- **Compiler enabled (future state):** check `vite.config.ts` for the compiler plugin first. Skip manual memoization by default. Reach for it only as an escape hatch — a value that needs referential stability for a non-React consumer, or a computation expensive enough that you want to be explicit regardless.

## Testing

Use **React Testing Library** with Vitest (already configured — see [`docs/quality-gate.md`](../../../docs/quality-gate.md)), testing behavior through the rendered DOM rather than component internals:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits the selected name', async () => {
  const onSelect = vi.fn();
  render(<MovieCard title="Inception" year={2010} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole('button', { name: /inception/i }));
  expect(onSelect).toHaveBeenCalledWith('Inception');
});
```

Query by **accessible role and name**, not by class or test id. A test that needs a `data-testid` to find an element is usually a sign the component is not accessible. The `eslint-plugin-jsx-a11y` linter is already in the config and will catch most of this at lint time.

Avoid `react-test-renderer` (deprecated) and shallow rendering (Enzyme-style) — both encourage testing implementation details instead of what the user actually experiences.

For network calls in tests, the project uses **MSW** with `onUnhandledRequest: 'error'`. A request without a handler fails the test instead of leaking to the real network — that is the feature, not a bug. Handlers live in `src/test/msw/`.
