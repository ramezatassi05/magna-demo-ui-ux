import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ConfidenceMeter } from '../../components/industrial/confidence-meter';

const meta: Meta<typeof ConfidenceMeter> = {
  title: 'Industrial/ConfidenceMeter',
  component: ConfidenceMeter,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'SVG arc gauge (270° sweep) for model / detection confidence. ' +
          'Use in hero contexts — test case card headers, results row detail, ' +
          'agent recommendations. For space-constrained cells use ConfidenceBadge instead. ' +
          'Coloring maps to status-pass / status-warning / status-fail via threshold level. ' +
          'Exposes `role="meter"` + `aria-valuenow` / `aria-valuetext` per ARIA 1.2 spec.',
      },
    },
  },
  argTypes: {
    score: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    showValue: { control: 'boolean' },
    animate: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {
  args: { score: 0.92, label: 'Detection confidence' },
};

export const Medium: Story = {
  args: { score: 0.74, label: 'Detection confidence' },
};

export const Low: Story = {
  args: { score: 0.42, label: 'Detection confidence' },
};

export const Small: Story = {
  args: { score: 0.88, size: 'sm', label: 'Confidence' },
};

export const Large: Story = {
  args: { score: 0.68, size: 'lg', label: 'Sensor fusion' },
};

export const NoValue: Story = {
  args: { score: 0.77, showValue: false, label: 'Confidence' },
};

export const NoLabel: Story = {
  args: { score: 0.55 },
};

export const CustomThresholds: Story = {
  args: {
    score: 0.55,
    label: 'Strict thresholds',
    thresholds: { high: 0.9, medium: 0.75 },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom thresholds: a 0.55 score maps to "low" under these strict thresholds ' +
          '(high ≥ 0.9, medium ≥ 0.75).',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <ConfidenceMeter score={0.92} size="sm" label="Small" animate={false} />
      <ConfidenceMeter score={0.74} size="md" label="Medium" animate={false} />
      <ConfidenceMeter score={0.42} size="lg" label="Large" animate={false} />
    </div>
  ),
};
