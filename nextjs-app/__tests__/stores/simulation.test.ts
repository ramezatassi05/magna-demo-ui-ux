/**
 * simulation-store — session-local Zustand store tests.
 *
 * Validates default state, param updates, reset behavior, and the
 * activate/deactivate toggle. Verifies non-persistence.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SIM_PARAMS } from '@/lib/simulations';
import { useSimulationStore } from '@/lib/stores/simulation-store';

beforeEach(() => {
  // Reset between tests — no persistence wrapper, so a plain setState works.
  useSimulationStore.setState({
    params: { ...DEFAULT_SIM_PARAMS },
    isActive: false,
  });
  localStorage.clear();
});

describe('simulation-store — initial state', () => {
  it('defaults to DEFAULT_SIM_PARAMS and isActive=false', () => {
    const { params, isActive } = useSimulationStore.getState();
    expect(params).toEqual(DEFAULT_SIM_PARAMS);
    expect(isActive).toBe(false);
  });
});

describe('setParam', () => {
  it('updates a single key without touching others', () => {
    useSimulationStore.getState().setParam('min_confidence', 0.75);
    const p = useSimulationStore.getState().params;
    expect(p.min_confidence).toBe(0.75);
    expect(p.max_fpr).toBe(DEFAULT_SIM_PARAMS.max_fpr);
    expect(p.min_distance).toBe(DEFAULT_SIM_PARAMS.min_distance);
  });
});

describe('reset', () => {
  it('restores defaults and deactivates', () => {
    useSimulationStore.getState().setParam('min_confidence', 0.9);
    useSimulationStore.getState().setParam('max_fpr', 0.02);
    useSimulationStore.getState().activate();
    useSimulationStore.getState().reset();
    const { params, isActive } = useSimulationStore.getState();
    expect(params).toEqual(DEFAULT_SIM_PARAMS);
    expect(isActive).toBe(false);
  });
});

describe('activate / deactivate', () => {
  it('toggles isActive', () => {
    useSimulationStore.getState().activate();
    expect(useSimulationStore.getState().isActive).toBe(true);
    useSimulationStore.getState().deactivate();
    expect(useSimulationStore.getState().isActive).toBe(false);
  });
});

describe('non-persistence', () => {
  it('does not write to localStorage', () => {
    useSimulationStore.getState().setParam('min_confidence', 0.5);
    useSimulationStore.getState().activate();
    // Should be zero keys since the store is not wrapped in persist.
    expect(localStorage.length).toBe(0);
  });
});
