/**
 * scoping-presets-store — persisted Zustand store tests.
 *
 * Verifies built-in seeding, user-preset CRUD, persistence shape, and
 * resolvePresetFilters dynamic-date injection.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  BUILTIN_PRESETS,
  resolvePresetFilters,
  useScopingPresetsStore,
} from '@/lib/stores/scoping-presets-store';

const STORAGE_KEY = 'scoping-presets-v1';

beforeEach(() => {
  // Reset store + localStorage between tests. persist() writes lazily, so
  // clearing both keeps tests independent.
  localStorage.clear();
  useScopingPresetsStore.setState({
    presets: [...BUILTIN_PRESETS],
    activePresetId: null,
  });
});

describe('scoping-presets-store — initial state', () => {
  it('seeds with 4 built-in presets', () => {
    const { presets } = useScopingPresetsStore.getState();
    expect(presets).toHaveLength(4);
    expect(presets.every((p) => p.builtin === true)).toBe(true);
  });

  it('seeds with expected built-in ids', () => {
    const ids = useScopingPresetsStore.getState().presets.map((p) => p.id);
    expect(ids).toContain('builtin-thermal-rain-night');
    expect(ids).toContain('builtin-aeb-regressions');
    expect(ids).toContain('builtin-camera-warnings-24h');
    expect(ids).toContain('builtin-lca-false-positives');
  });

  it('has null activePresetId initially', () => {
    expect(useScopingPresetsStore.getState().activePresetId).toBeNull();
  });
});

describe('addPreset', () => {
  it('appends a user preset with a user- id prefix', () => {
    useScopingPresetsStore.getState().addPreset({
      name: 'My preset',
      filters: { sensor_type: 'radar' },
    });
    const presets = useScopingPresetsStore.getState().presets;
    expect(presets).toHaveLength(5);
    const added = presets[presets.length - 1]!;
    expect(added.name).toBe('My preset');
    expect(added.id.startsWith('user-')).toBe(true);
    expect(added.builtin).toBe(false);
  });
});

describe('deletePreset', () => {
  it('removes a user preset', () => {
    useScopingPresetsStore.getState().addPreset({
      name: 'Temp',
      filters: {},
    });
    const allAfterAdd = useScopingPresetsStore.getState().presets;
    const added = allAfterAdd[allAfterAdd.length - 1]!;
    useScopingPresetsStore.getState().deletePreset(added.id);
    expect(useScopingPresetsStore.getState().presets).toHaveLength(4);
  });

  it('is a no-op for built-ins', () => {
    useScopingPresetsStore
      .getState()
      .deletePreset('builtin-thermal-rain-night');
    expect(useScopingPresetsStore.getState().presets).toHaveLength(4);
  });

  it('clears activePresetId when deleting the active preset', () => {
    useScopingPresetsStore.getState().addPreset({
      name: 'Temp',
      filters: {},
    });
    const added =
      useScopingPresetsStore.getState().presets[
        useScopingPresetsStore.getState().presets.length - 1
      ]!;
    useScopingPresetsStore.getState().applyPreset(added.id);
    expect(useScopingPresetsStore.getState().activePresetId).toBe(added.id);
    useScopingPresetsStore.getState().deletePreset(added.id);
    expect(useScopingPresetsStore.getState().activePresetId).toBeNull();
  });
});

describe('applyPreset / clearActive', () => {
  it('sets activePresetId to an existing preset', () => {
    useScopingPresetsStore.getState().applyPreset('builtin-aeb-regressions');
    expect(useScopingPresetsStore.getState().activePresetId).toBe(
      'builtin-aeb-regressions',
    );
  });

  it('ignores unknown ids', () => {
    useScopingPresetsStore.getState().applyPreset('does-not-exist');
    expect(useScopingPresetsStore.getState().activePresetId).toBeNull();
  });

  it('clearActive resets to null', () => {
    useScopingPresetsStore.getState().applyPreset('builtin-aeb-regressions');
    useScopingPresetsStore.getState().clearActive();
    expect(useScopingPresetsStore.getState().activePresetId).toBeNull();
  });
});

describe('persistence', () => {
  it('writes to localStorage under scoping-presets-v1', () => {
    useScopingPresetsStore.getState().addPreset({
      name: 'Persisted',
      filters: { sensor_type: 'lidar' },
    });
    // Zustand persist writes synchronously on set; verify the key exists.
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
  });

  it('only persists user presets (not built-ins)', () => {
    useScopingPresetsStore.getState().addPreset({
      name: 'Persisted',
      filters: {},
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    const persistedPresets = parsed.state.presets;
    expect(persistedPresets).toHaveLength(1);
    expect(persistedPresets[0].name).toBe('Persisted');
    expect(persistedPresets[0].builtin).toBe(false);
  });
});

describe('resolvePresetFilters', () => {
  it('injects date_from for the 24h camera preset', () => {
    const preset = BUILTIN_PRESETS.find(
      (p) => p.id === 'builtin-camera-warnings-24h',
    )!;
    // Fix "now" to 2026-04-05T12:00:00Z → date_from should be 2026-04-04.
    const nowMs = Date.UTC(2026, 3, 5, 12, 0, 0);
    const resolved = resolvePresetFilters(preset, nowMs);
    expect(resolved.date_from).toBe('2026-04-04');
    expect(resolved.sensor_type).toBe('camera');
    expect(resolved.result).toBe('warning');
  });

  it('returns filters unchanged for non-dynamic presets', () => {
    const preset = BUILTIN_PRESETS.find(
      (p) => p.id === 'builtin-aeb-regressions',
    )!;
    const resolved = resolvePresetFilters(preset);
    expect(resolved.feature).toBe('AEB');
    expect(resolved.result).toBe('fail');
    expect(resolved.date_from).toBeUndefined();
  });
});
