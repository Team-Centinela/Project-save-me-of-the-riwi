/**
 * test/axe — a thin wrapper around `axe-core`.
 *
 * The wrapper packages around axe-core (`vitest-axe`, `jest-axe`)
 * are unmaintained; the glue itself is small — most of this file
 * is type declarations that keep the strict TypeScript rules
 * happy. We call `axe.run` on the rendered container and map the
 * violations into a plain shape for assertion messages.
 *
 * Use as the last assertion in a `.spec.tsx` so the test reports
 * accessibility regressions alongside behavioural ones.
 */

import axe from 'axe-core';

export interface AxeViolation {
  readonly id: string;
  readonly impact: string;
  readonly help: string;
  readonly nodes: readonly { readonly target: readonly string[] }[];
}

interface RawAxeNode {
  readonly target: readonly unknown[];
}

interface RawAxeViolation {
  readonly id: string;
  readonly impact: string | null;
  readonly help: string;
  readonly nodes: readonly RawAxeNode[];
}

interface RawAxeResult {
  readonly violations: readonly RawAxeViolation[];
}

function toViolation(v: RawAxeViolation): AxeViolation {
  return {
    id: v.id,
    impact: v.impact ?? 'n/a',
    help: v.help,
    nodes: v.nodes.map((n) => ({ target: n.target.map(String) })),
  };
}

/** Tags axe-core checks by WCAG conformance level. The set is the
 *  union of A and AA, the levels the project commits to. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export async function runAxe(
  container: HTMLElement = document.body,
): Promise<readonly AxeViolation[]> {
  // `axe.run` has both callback and promise overloads; we use
  // the promise form and cast because the public `.d.ts`
  // declares the Promise overload but the value at runtime is
  // typed as `unknown` under our `verbatimModuleSyntax`
  // compilation mode.
  const result = await (
    axe.run as unknown as (
      c: HTMLElement,
      o: { runOnly: { type: 'tag'; values: readonly string[] }; resultTypes: 'violations'[] },
    ) => Promise<RawAxeResult>
  )(container, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    resultTypes: ['violations'],
  });
  return result.violations.map(toViolation);
}

export function formatViolations(violations: readonly AxeViolation[]): string {
  const lines: string[] = [];
  for (const v of violations) {
    lines.push(`[${v.id}] ${v.help} (impact: ${v.impact})`);
    for (const n of v.nodes) {
      lines.push(`  - ${n.target.join(' ')}`);
    }
  }
  return lines.join('\n');
}
