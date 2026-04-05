import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WhyPopover } from '../../components/industrial/why-popover';

const meta: Meta<typeof WhyPopover> = {
  title: 'Industrial/WhyPopover',
  component: WhyPopover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Rationale overlay that explains which data + logic drove an AI recommendation. ' +
          'Structure: Key evidence → Decision logic → free-form rationale. ' +
          'Built on Radix Popover for focus trap + Escape + outside-click. ' +
          'Use next to confidence meters, generated test cases, and agent recommendations.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullRationale: Story = {
  args: {
    title: 'Why confidence: Medium',
    subtitle: 'Sensor fusion heuristic',
    dataPoints: [
      {
        label: 'False positive rate',
        value: '4.2%',
        weight: 'primary',
        tone: 'critical',
      },
      { label: 'Detection range', value: '42 m', weight: 'primary' },
      { label: 'Scenario tags', value: 'rain · night · urban', tone: 'anomaly' },
      { label: 'Firmware', value: 'v4.2.1' },
    ],
    logic: [
      'Confidence below 0.7 when FPR > 3% and weather = rain',
      'Thermal sensor degrades > 40m in precipitation',
      'Recent cluster: 3 similar fails in 24h',
    ],
    rationale:
      'The thermal sensor shows a known regression profile at long range in heavy rain. ' +
      'Combined with the urban-night scenario cluster, the model downgrades confidence ' +
      'to Medium pending a firmware v4.3.0 re-test.',
  },
};

export const EvidenceOnly: Story = {
  args: {
    title: 'Why this test was flagged',
    dataPoints: [
      { label: 'Execution time', value: '4820 ms', weight: 'primary', tone: 'critical' },
      { label: 'Mean baseline', value: '620 ms' },
      { label: 'Regression', value: '7.8×' },
    ],
  },
};

export const LogicOnly: Story = {
  args: {
    title: 'Why severity: Critical',
    logic: [
      'Pass rate < 88% over 24h window',
      '3+ clustered failures on same sensor/feature',
      'Scenario contains safety-critical tag',
    ],
  },
};

export const EmptyState: Story = {
  args: {
    title: 'Why',
  },
};

export const CustomTrigger: Story = {
  args: {
    title: 'Why this rating',
    trigger: (
      <button
        type="button"
        className="rounded border border-state-override-border bg-state-override-bg px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-state-override"
      >
        Show rationale
      </button>
    ),
    dataPoints: [
      { label: 'Template match', value: 'aeb-distance-rain', weight: 'primary' },
      { label: 'Confidence axes', value: '2 of 3' },
    ],
    logic: ['Pattern matches known AEB regression profile'],
  },
};
