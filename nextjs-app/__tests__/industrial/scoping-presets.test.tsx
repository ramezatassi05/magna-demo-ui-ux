/**
 * ScopingPresets component tests.
 *
 * Verifies preset chips render + apply filters, active-state styling,
 * save-current popover with validation, and user-preset deletion via
 * AlertDialog. Resets the zustand store between tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ScopingPresets } from '@/components/industrial/scoping-presets';
import {
  BUILTIN_PRESETS,
  useScopingPresetsStore,
} from '@/lib/stores/scoping-presets-store';

beforeEach(() => {
  localStorage.clear();
  useScopingPresetsStore.setState({
    presets: [...BUILTIN_PRESETS],
    activePresetId: null,
  });
});

describe('ScopingPresets', () => {
  it('renders all 4 built-in presets as chips', () => {
    render(<ScopingPresets currentFilters={{}} onApply={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', {
      name: /saved filter scopes/i,
    });
    expect(toolbar).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /rainy night thermal fails/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /aeb distance regressions/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /last 24h camera warnings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /lca false positives/i }),
    ).toBeInTheDocument();
  });

  it('clicking a chip calls onApply with resolved filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<ScopingPresets currentFilters={{}} onApply={onApply} />);

    await user.click(
      screen.getByRole('button', { name: /aeb distance regressions/i }),
    );

    expect(onApply).toHaveBeenCalledWith({ feature: 'AEB', result: 'fail' });
    expect(useScopingPresetsStore.getState().activePresetId).toBe(
      'builtin-aeb-regressions',
    );
  });

  it('injects date_from for the 24h camera warnings preset', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<ScopingPresets currentFilters={{}} onApply={onApply} />);

    await user.click(
      screen.getByRole('button', { name: /last 24h camera warnings/i }),
    );

    expect(onApply).toHaveBeenCalledTimes(1);
    const filters = onApply.mock.calls[0]![0];
    expect(filters.sensor_type).toBe('camera');
    expect(filters.result).toBe('warning');
    expect(filters.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('active chip has aria-pressed=true and red border', () => {
    useScopingPresetsStore.setState({
      presets: [...BUILTIN_PRESETS],
      activePresetId: 'builtin-thermal-rain-night',
    });
    render(<ScopingPresets currentFilters={{}} onApply={vi.fn()} />);

    const activeChip = screen.getByRole('button', {
      name: /rainy night thermal fails/i,
    });
    expect(activeChip).toHaveAttribute('aria-pressed', 'true');
    expect(activeChip).toHaveClass('border-magna-red');

    const inactiveChip = screen.getByRole('button', {
      name: /aeb distance regressions/i,
    });
    expect(inactiveChip).toHaveAttribute('aria-pressed', 'false');
  });

  it('built-in chips do not expose a delete button', () => {
    render(<ScopingPresets currentFilters={{}} onApply={vi.fn()} />);
    expect(
      screen.queryByRole('button', {
        name: /delete preset rainy night thermal fails/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('user-created chips expose a delete button that opens a confirm dialog', async () => {
    useScopingPresetsStore.setState({
      presets: [
        ...BUILTIN_PRESETS,
        {
          id: 'user-x',
          name: 'My scope',
          filters: { result: 'fail' },
          builtin: false,
        },
      ],
      activePresetId: null,
    });
    const user = userEvent.setup();
    render(<ScopingPresets currentFilters={{}} onApply={vi.fn()} />);

    const deleteButton = screen.getByRole('button', {
      name: /delete preset my scope/i,
    });
    await user.click(deleteButton);

    expect(await screen.findByText(/delete preset\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(
      useScopingPresetsStore.getState().presets.find((p) => p.id === 'user-x'),
    ).toBeUndefined();
  });

  it('save-current popover Save button is disabled when filters are empty', async () => {
    const user = userEvent.setup();
    render(<ScopingPresets currentFilters={{}} onApply={vi.fn()} />);

    await user.click(
      screen.getByRole('button', { name: /save current filters as preset/i }),
    );

    const nameInput = await screen.findByLabelText(/preset name/i);
    await user.type(nameInput, 'My new preset');

    const saveButton = screen.getByRole('button', { name: /^save$/i });
    expect(saveButton).toBeDisabled();
  });

  it('save-current popover saves a new preset when name + filters present', async () => {
    const user = userEvent.setup();
    render(
      <ScopingPresets
        currentFilters={{ sensor_type: 'lidar' }}
        onApply={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /save current filters as preset/i }),
    );

    const nameInput = await screen.findByLabelText(/preset name/i);
    await user.type(nameInput, 'Lidar scope');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    const presets = useScopingPresetsStore.getState().presets;
    const saved = presets.find((p) => p.name === 'Lidar scope');
    expect(saved).toBeDefined();
    expect(saved?.filters).toEqual({ sensor_type: 'lidar' });
    expect(saved?.builtin).toBe(false);
  });
});
