// src/test/axe.spec.ts — verifies the wrapper around axe-core.
//
// The wrapper exists to give the rest of the suite a typed
// handle on axe.run that satisfies strict TypeScript rules
// while still calling the real axe-core API. The test below
// runs axe against a minimal DOM to prove the wrapper does
// what it claims.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runAxe, formatViolations } from './axe';

describe('test/axe wrapper', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.id = 'axe-host';
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('runs axe-core and returns a stable shape', async () => {
    host.innerHTML = '<button>OK</button>';
    const violations = await runAxe(host);
    expect(Array.isArray(violations)).toBe(true);
    for (const v of violations) {
      expect(typeof v.id).toBe('string');
      expect(typeof v.help).toBe('string');
      expect(typeof v.impact).toBe('string');
      expect(Array.isArray(v.nodes)).toBe(true);
    }
  });

  it('reports no violations on a well-formed button', async () => {
    host.innerHTML = '<button type="button">Click me</button>';
    const violations = await runAxe(host);
    expect(violations.length).toBe(0);
  });

  it('reports a violation when an image has no alt attribute', async () => {
    host.innerHTML = '<img src="x.png" />';
    const violations = await runAxe(host);
    const imageAlt = violations.find((v) => v.id === 'image-alt');
    expect(imageAlt).toBeDefined();
  });

  it('formats a list of violations for error messages', () => {
    const out = formatViolations([
      {
        id: 'foo',
        impact: 'serious',
        help: 'A serious issue',
        nodes: [{ target: ['img'] }, { target: ['button'] }],
      },
    ]);
    expect(out).toContain('[foo]');
    expect(out).toContain('A serious issue');
    expect(out).toContain('img');
    expect(out).toContain('button');
  });
});
