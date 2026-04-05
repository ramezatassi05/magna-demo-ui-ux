import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ConfidenceBadge } from '../components/confidence-badge';

const meta: Meta<typeof ConfidenceBadge> = {
  title: 'Components/ConfidenceBadge',
  component: ConfidenceBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Pill that communicates model / detection confidence (High / Medium / Low). ' +
          'Accepts either a numeric `score` (0.0–1.0, mapped via `confidenceLevel()`) ' +
          'or an explicit `level`. Use next to test results or AI-generated content ' +
          "whenever the user needs to calibrate trust in a model's output.",
      },
    },
  },
  argTypes: {
    level: {
      control: 'select',
      options: [undefined, 'high', 'medium', 'low'],
      description: 'Explicit confidence level. Takes precedence when no score is given.',
    },
    score: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Numeric score 0.0–1.0, mapped to a level via threshold.',
    },
    showIcon: { control: 'boolean' },
    showScore: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'md'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const High: Story = {
  args: { level: 'high' },
};

export const Medium: Story = {
  args: { level: 'medium' },
};

export const Low: Story = {
  args: { level: 'low' },
};

export const WithScore: Story = {
  args: { score: 0.92, showScore: true },
  parameters: {
    docs: {
      description: {
        story:
          'When `showScore` is on, the numeric confidence (%) renders beside the label. ' +
          'The score is mapped to a level via `confidenceLevel()` in `lib/aggregations.ts`.',
      },
    },
  },
};

export const FromNumericScore: Story = {
  args: { score: 0.72 },
  parameters: {
    docs: {
      description: {
        story: 'Driving the badge entirely from a numeric score (0.72 → medium).',
      },
    },
  },
};

export const SmallSize: Story = {
  args: { level: 'high', size: 'sm' },
};

export const WithoutIcon: Story = {
  args: { level: 'medium', showIcon: false },
};

/** Side-by-side reference of all three levels. */
export const AllLevels: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ConfidenceBadge level="high" />
      <ConfidenceBadge level="medium" />
      <ConfidenceBadge level="low" />
    </div>
  ),
};
