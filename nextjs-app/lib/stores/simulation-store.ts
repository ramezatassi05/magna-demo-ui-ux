/**
 * simulation-store — session-local "what-if" threshold parameters.
 *
 * NOT persisted by design: simulations are scratchpad state. Closing the
 * tab or navigating away discards them. The dashboard's SimulatedRibbon
 * keys off `isActive` to show a visible banner while a simulation is live.
 */

import { create } from 'zustand';

import {
  DEFAULT_SIM_PARAMS,
  type SimulationParams,
} from '@/lib/simulations';

interface SimulationState {
  params: SimulationParams;
  isActive: boolean;
  setParam: (key: keyof SimulationParams, value: number) => void;
  reset: () => void;
  activate: () => void;
  deactivate: () => void;
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  params: { ...DEFAULT_SIM_PARAMS },
  isActive: false,
  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),
  reset: () =>
    set({
      params: { ...DEFAULT_SIM_PARAMS },
      isActive: false,
    }),
  activate: () => set({ isActive: true }),
  deactivate: () => set({ isActive: false }),
}));
