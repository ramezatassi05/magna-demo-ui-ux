/**
 * Accessibility rollup — G2
 *
 * Renders each of the 12 industrial components in its representative
 * state(s) and asserts zero jest-axe violations. This is a backstop
 * above the per-component tests: it catches regressions when a
 * component is composed with realistic neighbours (Popover open,
 * AlertDialog open, active simulation, etc.).
 *
 * For Radix-portal'd content (Popover, AlertDialog, Tooltip) the axe
 * pass runs against `document.body` so portal nodes are in scope.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

import { IndustrialIcon } from '@/components/industrial/industrial-icon';
import { ConfidenceMeter } from '@/components/industrial/confidence-meter';
import { AnomalyAlertBadge } from '@/components/industrial/anomaly-alert-badge';
import { WhyPopover } from '@/components/industrial/why-popover';
import { EngineeringMetadata } from '@/components/industrial/engineering-metadata';
import { ScopingPresets } from '@/components/industrial/scoping-presets';
import { ParameterSliderPanel } from '@/components/industrial/parameter-slider-panel';
import { SimulatedRibbon } from '@/components/industrial/simulated-ribbon';
import { DynamicTaskCard } from '@/components/industrial/dynamic-task-card';
import { DecisionTrace } from '@/components/industrial/decision-trace';
import { ManualOverrideControl } from '@/components/industrial/manual-override-control';
import {
  FadeIn,
  SlideUp,
  StaggerGroup,
} from '@/components/industrial/motion-primitives';
import type { OperationalTask } from '@/lib/operations';
import { useSimulationStore } from '@/lib/stores/simulation-store';
import { useScopingPresetsStore } from '@/lib/stores/scoping-presets-store';
import type { ToolCall } from '@/lib/types';

// Polyfill ResizeObserver — Radix Slider observes thumb size.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (MockResizeObserver as typeof ResizeObserver);

// Reset Zustand stores between tests so assertions aren't polluted by
// prior renders that toggled state.
beforeEach(() => {
  useSimulationStore.setState({
    params: { min_confidence: 0, max_fpr: 1, min_distance: 0 },
    isActive: false,
  });
  useScopingPresetsStore.setState({ activePresetId: null });
});

describe('Industrial components — a11y rollup', () => {
  it('IndustrialIcon — no violations', async () => {
    const { container } = render(
      <IndustrialIcon
        name="Warning"
        size="md"
        tone="anomaly"
        decorative={false}
        aria-label="Warning"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ConfidenceMeter — no violations', async () => {
    const { container } = render(
      <ConfidenceMeter
        score={0.78}
        size="md"
        label="Detection confidence"
        animate={false}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('AnomalyAlertBadge — all variants', () => {
    it('standalone critical — no violations', async () => {
      const { container } = render(
        <AnomalyAlertBadge
          severity="critical"
          variant="standalone"
          value="+0.8pp"
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('inline-row anomaly — no violations', async () => {
      const { container } = render(
        <div style={{ position: 'relative', height: 40 }}>
          <AnomalyAlertBadge
            severity="anomaly"
            variant="inline-row"
            tooltip="ANOMALY — TC-123"
          />
        </div>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('kpi-corner watch — no violations', async () => {
      const { container } = render(
        <div style={{ position: 'relative', width: 200, height: 100 }}>
          <AnomalyAlertBadge
            severity="watch"
            variant="kpi-corner"
            tooltip="Watch threshold crossed"
          />
        </div>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('WhyPopover (opened) — no violations on full document', async () => {
    const user = userEvent.setup();
    render(
      <WhyPopover
        title="Why confidence: Medium"
        subtitle="Derived from 12 validation runs"
        dataPoints={[
          { label: 'Matching failures', value: 12, weight: 'primary', tone: 'anomaly' },
          { label: 'Avg confidence', value: '61%', tone: 'anomaly' },
        ]}
        logic={['Score < 0.7 threshold', 'Fail cluster detected']}
      />,
    );
    await user.click(screen.getByRole('button', { name: /show rationale/i }));
    // Popover content is portalled to document.body; scan the full doc.
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('EngineeringMetadata — no violations', async () => {
    const { container } = render(
      <EngineeringMetadata
        items={[
          { label: 'run', value: 'TC-2026-00142' },
          { label: 'dur', value: '1.4s' },
          { label: 'rows', value: 3 },
        ]}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ScopingPresets — no violations', async () => {
    const { container } = render(
      <ScopingPresets onApply={() => {}} currentFilters={{ sensor_type: 'thermal' }} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ParameterSliderPanel (open) — no violations', async () => {
    const { container } = render(
      <ParameterSliderPanel open={true} onOpenChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('SimulatedRibbon (active) — no violations', async () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.5, max_fpr: 0.03, min_distance: 20 },
      isActive: true,
    });
    const { container } = render(<SimulatedRibbon />);
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('DynamicTaskCard — severity variants', () => {
    const baseTask: OperationalTask = {
      id: 'task-1',
      severity: 'critical',
      title: 'Thermal AEB critical failure',
      metric: '3 failures · 24h',
      context: 'Clustered Thermal AEB regressions',
      filterLink: { sensor_type: 'thermal', feature: 'AEB', result: 'fail' },
      actionLabel: 'Inspect failures',
    };

    it('critical — no violations', async () => {
      const { container } = render(<DynamicTaskCard task={baseTask} />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('nominal — no violations', async () => {
      const { container } = render(
        <DynamicTaskCard
          task={{
            ...baseTask,
            severity: 'nominal',
            title: 'All sensors nominal',
          }}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('DecisionTrace (expanded with tools) — no violations', async () => {
    const toolCalls: ToolCall[] = [
      {
        id: 'tc1',
        name: 'query_tests',
        args: { sensor_type: 'thermal' },
        status: 'ok',
        preview: '{"row_count":3}',
      },
    ];
    const { container } = render(
      <DecisionTrace
        thinking={['Looking up thermal failures.']}
        toolCalls={toolCalls}
        active={false}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('ManualOverrideControl — all statuses', () => {
    it('idle — no violations', async () => {
      const { container } = render(
        <ManualOverrideControl status="idle" onStop={() => {}} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('streaming (Stop agent visible) — no violations', async () => {
      const { container } = render(
        <ManualOverrideControl status="streaming" onStop={() => {}} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('error — no violations', async () => {
      const { container } = render(
        <ManualOverrideControl status="error" onStop={() => {}} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('MotionPrimitives (FadeIn + SlideUp + StaggerGroup) — no violations', async () => {
    const { container } = render(
      <StaggerGroup staggerMs={80}>
        <FadeIn>
          <p>First</p>
        </FadeIn>
        <SlideUp>
          <p>Second</p>
        </SlideUp>
      </StaggerGroup>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
