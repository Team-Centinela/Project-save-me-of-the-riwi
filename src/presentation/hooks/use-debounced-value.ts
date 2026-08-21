// presentation/hooks/use-debounced-value.ts — debounce a fast-changing
// value so a downstream consumer (a fetch, a formatter) only sees
// the steady state.
//
// The hook is intentionally tiny: a state, an effect that re-arms
// a timer on every change, and a cleanup. The test below pins
// every branch.

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(handle);
    };
  }, [value, delayMs]);

  return debounced;
}
