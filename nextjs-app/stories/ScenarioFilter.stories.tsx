import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ScenarioFilter } from '../components/scenario-filter';
import type { TestFilters } from '../lib/types';
import {
  MOCK_FILTERS_ACTIVE,
  MOCK_FILTERS_EMPTY,
  MOCK_FILTERS_SEARCH_ONLY,
} from '../.storybook/mocks/fixtures';

const meta: Meta<typeof ScenarioFilter> = {
  title: 'Components/ScenarioFilter',
  component: ScenarioFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'Filter bar for the Results page. Combines a debounced search input ' +
          '(300ms), three select dropdowns (Sensor / Result / Feature), and a date ' +
          'range. Emits partial filter updates via `onChange` so the parent can ' +
          'sync them to the URL.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 1080 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

function countActive(f: TestFilters): number {
  return (
    (f.sensor_type ? 1 : 0) +
    (f.result ? 1 : 0) +
    (f.feature ? 1 : 0) +
    (f.date_from ? 1 : 0) +
    (f.date_to ? 1 : 0) +
    (f.search ? 1 : 0)
  );
}

/**
 * Helper render that wires the `filters` / `onChange` props to local state,
 * so the dropdowns, search input, and Clear button all feel "live" inside
 * the Storybook iframe.
 */
function InteractiveFilter({ initial }: { initial: TestFilters }) {
  const [filters, setFilters] = useState<TestFilters>(initial);
  const active = countActive(filters);
  return (
    <div className="space-y-3">
      <ScenarioFilter
        filters={filters}
        onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
        onClear={() => setFilters({ page: 1, page_size: 20 })}
        activeCount={active}
      />
      <pre className="rounded-md bg-surface-dark p-3 font-mono text-[11px] text-ink-on-dark">
        {JSON.stringify(filters, null, 2)}
      </pre>
    </div>
  );
}

export const Default: Story = {
  render: () => <InteractiveFilter initial={MOCK_FILTERS_EMPTY} />,
  parameters: {
    docs: {
      description: {
        story:
          'Empty initial state — no active filters. The Clear all button is disabled.',
      },
    },
  },
};

export const WithSelections: Story = {
  render: () => <InteractiveFilter initial={MOCK_FILTERS_ACTIVE} />,
  parameters: {
    docs: {
      description: {
        story:
          'All filters populated. The red "N active" pill shows the count, and ' +
          'Clear all becomes enabled. Ranges include date_from and date_to.',
      },
    },
  },
};

export const WithSearch: Story = {
  render: () => <InteractiveFilter initial={MOCK_FILTERS_SEARCH_ONLY} />,
  parameters: {
    docs: {
      description: {
        story: 'Only the search field is active. Typing here debounces for 300ms before firing `onChange`.',
      },
    },
  },
};
