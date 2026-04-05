/**
 * ParameterSliderPanel tests.
 *
 * Verifies slider labels + aria-valuetext formatting, reset button,
 * auto-activate behaviour, and collapsible open/close.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ParameterSliderPanel } from '@/components/industrial/parameter-slider-panel';
import { DEFAULT_SIM_PARAMS } from '@/lib/simulations';
import { useSimulationStore } from '@/lib/stores/simulation-store';

// Polyfill ResizeObserver — Radix Slider observes thumb size for positioning.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (MockResizeObserver as typeof ResizeObserver);

beforeEach(() => {
  useSimulationStore.setState({
    params: { ...DEFAULT_SIM_PARAMS },
    isActive: false,
  });
});

function renderPanel(open = true) {
  const onOpenChange = vi.fn();
  const utils = render(
    <ParameterSliderPanel open={open} onOpenChange={onOpenChange} />,
  );
  return { ...utils, onOpenChange };
}

describe('ParameterSliderPanel', () => {
  it('renders three sliders with correct visible labels when open', () => {
    renderPanel(true);
    // Visible label text is rendered via labeled span elements
    expect(screen.getByText(/minimum confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/max false-positive rate/i)).toBeInTheDocument();
    expect(screen.getByText(/min detection range/i)).toBeInTheDocument();
    // And three actual slider controls exist
    expect(screen.getAllByRole('slider')).toHaveLength(3);
  });

  it('hides sliders when collapsed', () => {
    renderPanel(false);
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('header toggle button calls onOpenChange', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderPanel(false);
    await user.click(
      screen.getByRole('button', { name: /simulate thresholds/i }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('renders formatted value readouts per unit', () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.65, max_fpr: 0.03, min_distance: 20 },
      isActive: true,
    });
    renderPanel(true);

    // Visible readouts next to each slider — this is what users actually see
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('3.0%')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument();

    // And each slider's aria-valuenow matches the current value
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '0.65');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '0.03');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '20');
  });

  it('shows Active badge when store is active', () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.5, max_fpr: 1, min_distance: 0 },
      isActive: true,
    });
    renderPanel(false);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('Reset button restores defaults and deactivates', async () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.8, max_fpr: 0.01, min_distance: 50 },
      isActive: true,
    });
    const user = userEvent.setup();
    renderPanel(true);

    await user.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(useSimulationStore.getState().params).toEqual(DEFAULT_SIM_PARAMS);
    expect(useSimulationStore.getState().isActive).toBe(false);
  });

  it('ArrowRight on a slider updates the store (throttled)', async () => {
    const user = userEvent.setup();
    renderPanel(true);

    const sliders = screen.getAllByRole('slider');
    const distanceSlider = sliders[2]!; // min_distance (0-100)
    distanceSlider.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(useSimulationStore.getState().params.min_distance).toBeGreaterThan(
        0,
      );
    });
  });

  it('changing a param from default auto-activates the store', async () => {
    const user = userEvent.setup();
    renderPanel(true);

    const sliders = screen.getAllByRole('slider');
    const confidenceSlider = sliders[0]!; // min_confidence
    confidenceSlider.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(useSimulationStore.getState().isActive).toBe(true);
    });
  });
});
