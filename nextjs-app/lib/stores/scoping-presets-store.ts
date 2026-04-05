/**
 * scoping-presets-store — persisted saved filter scopes for the Results page.
 *
 * Seeded with 4 built-in presets that match Magna's most common triage
 * queries. Built-ins cannot be deleted; user presets persist to localStorage
 * under `scoping-presets-v1`. Only user presets + the active id are serialized —
 * built-ins live in code and re-seed on every load.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { IndustrialIconName } from '@/components/industrial/industrial-icon';
import type { TestFilters } from '@/lib/types';

export interface ScopingPreset {
  id: string;
  name: string;
  description?: string;
  filters: Partial<TestFilters>;
  iconName?: IndustrialIconName;
  builtin?: boolean;
}

export const BUILTIN_PRESETS: readonly ScopingPreset[] = [
  {
    id: 'builtin-thermal-rain-night',
    name: 'Rainy night thermal fails',
    filters: { sensor_type: 'thermal', result: 'fail', search: 'rain night' },
    iconName: 'Sensor',
    builtin: true,
  },
  {
    id: 'builtin-aeb-regressions',
    name: 'AEB distance regressions',
    filters: { feature: 'AEB', result: 'fail' },
    iconName: 'Warning',
    builtin: true,
  },
  {
    id: 'builtin-camera-warnings-24h',
    name: 'Last 24h camera warnings',
    filters: { sensor_type: 'camera', result: 'warning' },
    iconName: 'Chart',
    builtin: true,
  },
  {
    id: 'builtin-lca-false-positives',
    name: 'LCA false positives',
    filters: { feature: 'LCA', search: 'false positive' },
    iconName: 'Critical',
    builtin: true,
  },
];

interface PersistedState {
  presets: ScopingPreset[]; // user-only
  activePresetId: string | null;
}

interface ScopingPresetsState {
  presets: ScopingPreset[]; // merged: built-ins + user
  activePresetId: string | null;
  addPreset: (input: Omit<ScopingPreset, 'id' | 'builtin'>) => void;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
  clearActive: () => void;
}

function generateId(): string {
  // crypto.randomUUID is available in Node 20+ and modern browsers.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `user-${crypto.randomUUID()}`;
  }
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useScopingPresetsStore = create<ScopingPresetsState>()(
  persist(
    (set, get) => ({
      presets: [...BUILTIN_PRESETS],
      activePresetId: null,

      addPreset: (input) => {
        const next: ScopingPreset = {
          id: generateId(),
          name: input.name,
          description: input.description,
          filters: input.filters,
          iconName: input.iconName,
          builtin: false,
        };
        set({ presets: [...get().presets, next] });
      },

      deletePreset: (id) => {
        const target = get().presets.find((p) => p.id === id);
        if (!target || target.builtin) return; // no-op on built-ins
        set({
          presets: get().presets.filter((p) => p.id !== id),
          activePresetId:
            get().activePresetId === id ? null : get().activePresetId,
        });
      },

      applyPreset: (id) => {
        const exists = get().presets.some((p) => p.id === id);
        if (!exists) return;
        set({ activePresetId: id });
      },

      clearActive: () => set({ activePresetId: null }),
    }),
    {
      name: 'scoping-presets-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        presets: state.presets.filter((p) => !p.builtin),
        activePresetId: state.activePresetId,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<PersistedState> | undefined;
        const userPresets = p?.presets ?? [];
        // Rehydrate: built-ins (from current initial) + persisted user presets.
        return {
          ...current,
          presets: [...BUILTIN_PRESETS, ...userPresets],
          activePresetId: p?.activePresetId ?? null,
        };
      },
    },
  ),
);

/**
 * Resolve any dynamic fields (e.g., `date_from` for the 24h preset) into
 * concrete values at the moment the preset is applied. Consumers should
 * always pass presets through this helper before pushing to URL filters.
 */
export function resolvePresetFilters(
  preset: ScopingPreset,
  nowMs: number = Date.now(),
): Partial<TestFilters> {
  if (preset.id === 'builtin-camera-warnings-24h') {
    const DAY = 24 * 60 * 60 * 1000;
    const from = new Date(nowMs - DAY);
    const yyyy = from.getUTCFullYear();
    const mm = String(from.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(from.getUTCDate()).padStart(2, '0');
    return {
      ...preset.filters,
      date_from: `${yyyy}-${mm}-${dd}`,
    };
  }
  return { ...preset.filters };
}
