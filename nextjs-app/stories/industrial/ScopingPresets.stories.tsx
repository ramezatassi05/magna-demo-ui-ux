import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';

import { ScopingPresets } from '../../components/industrial/scoping-presets';
import {
  BUILTIN_PRESETS,
  useScopingPresetsStore,
} from '../../lib/stores/scoping-presets-store';

const meta: Meta<typeof ScopingPresets> = {
  title: 'Industrial/ScopingPresets',
  component: ScopingPresets,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horizontal chip rack of saved filter scopes. Built-in presets match ' +
          "Magna's most common triage queries (rainy-night thermal fails, AEB " +
          'regressions, camera warnings in last 24h, LCA false positives). User ' +
          'presets persist to localStorage and can be deleted via an AlertDialog ' +
          'confirmation. The "+ Save current" chip captures the currently applied ' +
          'filters into a named preset.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Reset-store decorator — keeps stories independent
function StoreResetDecorator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useScopingPresetsStore.setState({
      presets: [...BUILTIN_PRESETS],
      activePresetId: null,
    });
  }, []);
  return <>{children}</>;
}

export const Default: Story = {
  args: {
    currentFilters: {},
    onApply: (filters) => console.log('onApply', filters),
  },
  decorators: [
    (Story) => (
      <StoreResetDecorator>
        <Story />
      </StoreResetDecorator>
    ),
  ],
};

export const WithCurrentFilters: Story = {
  args: {
    currentFilters: { sensor_type: 'radar', result: 'pass' },
    onApply: (filters) => console.log('onApply', filters),
  },
  decorators: [
    (Story) => (
      <StoreResetDecorator>
        <Story />
      </StoreResetDecorator>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'When `currentFilters` is non-empty, the "Save current" chip Save ' +
          'button becomes enabled after entering a name.',
      },
    },
  },
};

export const ActivePreset: Story = {
  args: {
    currentFilters: { sensor_type: 'thermal', result: 'fail' },
    onApply: (filters) => console.log('onApply', filters),
  },
  decorators: [
    (Story) => {
      // Apply a builtin preset to show active state
      useEffect(() => {
        useScopingPresetsStore.setState({
          presets: [...BUILTIN_PRESETS],
          activePresetId: 'builtin-thermal-rain-night',
        });
      }, []);
      return <Story />;
    },
  ],
};

export const WithUserPresets: Story = {
  args: {
    currentFilters: {},
    onApply: (filters) => console.log('onApply', filters),
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useScopingPresetsStore.setState({
          presets: [
            ...BUILTIN_PRESETS,
            {
              id: 'user-custom-1',
              name: 'My urgent triage',
              filters: { result: 'fail', feature: 'AEB' },
              iconName: 'Bookmark',
              builtin: false,
            },
            {
              id: 'user-custom-2',
              name: 'Radar weekend runs',
              filters: { sensor_type: 'radar' },
              iconName: 'Bookmark',
              builtin: false,
            },
          ],
          activePresetId: null,
        });
      }, []);
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'User-created presets show a delete × button on hover that opens an ' +
          'AlertDialog for confirmation before removal. Built-ins never show the ' +
          'delete affordance.',
      },
    },
  },
};
