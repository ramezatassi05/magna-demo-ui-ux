import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DynamicTaskCard } from '../../components/industrial/dynamic-task-card';
import type { OperationalTask } from '../../lib/operations';

const meta: Meta<typeof DynamicTaskCard> = {
  title: 'Industrial/DynamicTaskCard',
  component: DynamicTaskCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Ranked operational triage card for the Dashboard. Renders a ' +
          '`deriveTasks` output with severity accent bar, title + metric, ' +
          'context, WhyPopover, and a deep-link action into /results.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const base: OperationalTask = {
  id: 'task-1',
  severity: 'critical',
  title: 'Thermal AEB fail rate spiked 8.4%',
  metric: '12 failures · 24h',
  context: 'Normally 2-3/day · started 2026-04-04T18:00Z',
  filterLink: { sensor_type: 'thermal', feature: 'AEB', result: 'fail' },
  actionLabel: 'Inspect failures',
  rationale: [
    { label: 'Fail count', value: 12, weight: 'primary', tone: 'critical' },
    { label: 'Baseline', value: '2.3/day' },
    { label: 'Confidence floor', value: '0.48' },
  ],
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[560px]">{children}</div>
);

export const Critical: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard task={base} />
    </Wrapper>
  ),
};

export const Anomaly: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard
        task={{
          ...base,
          id: 'task-2',
          severity: 'anomaly',
          title: 'Radar false-positive rate creeping upward',
          metric: 'FPR 3.6% · +0.8pp',
          context: 'Last 7 days · urban scenarios',
        }}
      />
    </Wrapper>
  ),
};

export const Watch: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard
        task={{
          ...base,
          id: 'task-3',
          severity: 'watch',
          title: 'LiDAR detection range trending low in fog',
          metric: '4 low-confidence runs',
          context: 'Recent 24h · monitoring',
        }}
      />
    </Wrapper>
  ),
};

export const Nominal: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard
        task={{
          ...base,
          id: 'task-4',
          severity: 'nominal',
          title: 'Camera AEB steady at 94% pass',
          metric: '0 new failures',
          context: 'No anomalies detected',
          rationale: undefined,
        }}
      />
    </Wrapper>
  ),
};

export const NoAction: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard
        task={{ ...base, filterLink: undefined, rationale: undefined }}
      />
    </Wrapper>
  ),
};

export const WithoutRationale: Story = {
  render: () => (
    <Wrapper>
      <DynamicTaskCard task={{ ...base, rationale: undefined }} />
    </Wrapper>
  ),
};
