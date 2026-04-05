/**
 * SimulatedRibbon tests.
 *
 * Verifies the banner only renders when simulation is active, shows
 * formatted params, and Exit button resets + deactivates the store.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SimulatedRibbon } from '@/components/industrial/simulated-ribbon';
import { DEFAULT_SIM_PARAMS } from '@/lib/simulations';
import { useSimulationStore } from '@/lib/stores/simulation-store';

beforeEach(() => {
  useSimulationStore.setState({
    params: { ...DEFAULT_SIM_PARAMS },
    isActive: false,
  });
});

describe('SimulatedRibbon', () => {
  it('renders nothing when simulation is inactive', () => {
    const { container } = render(<SimulatedRibbon />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SIMULATED label + formatted params when active', () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.65, max_fpr: 0.03, min_distance: 20 },
      isActive: true,
    });
    render(<SimulatedRibbon />);
    expect(screen.getByText(/simulated/i)).toBeInTheDocument();
    expect(
      screen.getByText(/min conf 65% · max FPR 3\.0% · min range 20m/i),
    ).toBeInTheDocument();
  });

  it('has role="status" with aria-live=polite', () => {
    useSimulationStore.setState({
      params: DEFAULT_SIM_PARAMS,
      isActive: true,
    });
    render(<SimulatedRibbon />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('Exit button deactivates store and resets params', async () => {
    useSimulationStore.setState({
      params: { min_confidence: 0.9, max_fpr: 0.01, min_distance: 50 },
      isActive: true,
    });
    const user = userEvent.setup();
    render(<SimulatedRibbon />);

    await user.click(screen.getByRole('button', { name: /exit simulation/i }));

    expect(useSimulationStore.getState().isActive).toBe(false);
    expect(useSimulationStore.getState().params).toEqual(DEFAULT_SIM_PARAMS);
  });
});
