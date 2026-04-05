import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EngineeringMetadata } from '../../components/industrial/engineering-metadata';

const meta: Meta<typeof EngineeringMetadata> = {
  title: 'Industrial/EngineeringMetadata',
  component: EngineeringMetadata,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Mono, uppercase-tracked, muted metadata strip. The signature visual that ' +
          'separates enterprise industrial UI from consumer dashboards. Used on KpiCard ' +
          'footers, ToolCallCard headers, DynamicTaskCard trailers, and agent done events ' +
          'wherever we want run_id · duration · row_count · timestamp context.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const KpiFooter: Story = {
  args: {
    items: [
      { label: 'source', value: 'validation.main' },
      { label: 'window', value: '90d' },
      { label: 'runs', value: '550' },
    ],
  },
};

export const ToolTrace: Story = {
  args: {
    items: [
      { label: 'tool', value: 'query_tests' },
      { label: 'dur', value: '142ms' },
      { label: 'rows', value: '12' },
    ],
  },
};

export const ValueOnlyIds: Story = {
  args: {
    items: [
      { value: 'run_a91f2e', valueOnly: true },
      { label: 'ts', value: '2026-04-05T14:22:31Z' },
      { label: 'agent', value: 'mock' },
    ],
  },
};

export const SimulatedMode: Story = {
  args: {
    items: [
      { label: 'mode', value: 'SIMULATED', tone: 'override' },
      { label: 'min_conf', value: '≥ 72%' },
      { label: 'max_fpr', value: '≤ 2.5%' },
    ],
  },
};

export const MixedTones: Story = {
  args: {
    items: [
      { label: 'status', value: 'NOMINAL', tone: 'nominal' },
      { label: 'sensors', value: '4' },
      { label: 'alerts', value: '2 critical', tone: 'critical' },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ label: 'build', value: 'v0.1.0' }],
  },
};
