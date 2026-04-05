/**
 * Reduced-motion audit — G3
 *
 * Verifies the three layers of motion gating:
 *   1. `window.matchMedia('(prefers-reduced-motion: reduce)')` is stubbed
 *      globally in vitest.setup.ts to `matches: true`, so all tests run
 *      under reduced-motion by default.
 *   2. framer-motion primitives (FadeIn / SlideUp / InsightPulse /
 *      StaggerGroup / ConfirmationFlash) short-circuit to plain wrappers
 *      with no inline animation styles.
 *   3. The `@media (prefers-reduced-motion: reduce)` block in globals.css
 *      lists every decorative CSS animation utility so they get disabled
 *      at runtime.
 *
 * Layer #3 can't be observed via jsdom (it doesn't evaluate CSS media
 * queries), so we parse the stylesheet source and assert the expected
 * utility names are present.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import {
  FadeIn,
  SlideUp,
  InsightPulse,
  StaggerGroup,
  ConfirmationFlash,
} from '@/components/industrial/motion-primitives';

describe('Reduced-motion audit', () => {
  it('matchMedia mock reports matches:true for (prefers-reduced-motion: reduce)', () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(mql.matches).toBe(true);
  });

  describe('MotionPrimitives short-circuit to plain wrappers', () => {
    it('FadeIn renders children without framer-motion style props', () => {
      const { container } = render(
        <FadeIn>
          <p data-testid="inner">hello</p>
        </FadeIn>,
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.tagName).toBe('DIV');
      // Under reduced-motion the wrapper has NO inline opacity/transform.
      const style = wrapper.getAttribute('style') ?? '';
      expect(style).not.toMatch(/opacity/i);
      expect(style).not.toMatch(/transform/i);
      // Child is visible (in DOM).
      expect(wrapper.querySelector('[data-testid="inner"]')).not.toBeNull();
    });

    it('SlideUp renders children with no y-translate', () => {
      const { container } = render(
        <SlideUp distance={20}>
          <p>hi</p>
        </SlideUp>,
      );
      const wrapper = container.firstElementChild as HTMLElement;
      const style = wrapper.getAttribute('style') ?? '';
      expect(style).not.toMatch(/transform/i);
      expect(style).not.toMatch(/translateY/i);
    });

    it('InsightPulse renders a plain <span>', () => {
      const { container } = render(
        <InsightPulse triggerKey="v1">
          <span>42</span>
        </InsightPulse>,
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.tagName).toBe('SPAN');
      const style = wrapper.getAttribute('style') ?? '';
      expect(style).not.toMatch(/scale/i);
    });

    it('StaggerGroup wraps children without per-child delay styling', () => {
      const { container } = render(
        <StaggerGroup staggerMs={100}>
          <p>A</p>
          <p>B</p>
        </StaggerGroup>,
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.tagName).toBe('DIV');
      // Both children present, neither wrapped in a motion.div.
      expect(wrapper.querySelectorAll('p')).toHaveLength(2);
    });

    it('ConfirmationFlash omits the overlay motion.span under reduced-motion', () => {
      const { container } = render(
        <ConfirmationFlash triggerKey={1}>
          <p data-testid="body">ok</p>
        </ConfirmationFlash>,
      );
      // Wrapper is always present; the flash overlay should NOT be.
      const flash = container.querySelector('.pointer-events-none');
      expect(flash).toBeNull();
      expect(container.querySelector('[data-testid="body"]')).not.toBeNull();
    });
  });

  describe('CSS media query disables decorative animations', () => {
    const cssPath = path.resolve(__dirname, '../../app/globals.css');
    const cssSource = readFileSync(cssPath, 'utf-8');

    // Extract the @media (prefers-reduced-motion: reduce) { ... } block.
    const match = cssSource.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)^\}/m,
    );

    it('reduced-motion block exists in globals.css', () => {
      expect(match).not.toBeNull();
    });

    const block = match?.[1] ?? '';

    it.each([
      'animate-agent-pulse',
      'animate-anomaly-pulse',
      'animate-confirmation-flash',
      'animate-fade-in',
      'skeleton-shimmer',
    ])('disables .%s', (cls) => {
      expect(block).toContain(cls);
    });

    it('sets animation: none !important', () => {
      expect(block).toMatch(/animation:\s*none\s*!important/);
    });
  });
});
