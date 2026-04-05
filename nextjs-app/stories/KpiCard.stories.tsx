import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Activity, Gauge, Target, TrendingDown } from 'lucide-react';
import { KpiCard } from '../components/kpi-card';

const meta: Meta<typeof KpiCard> = {
  title: 'Components/KpiCard',
  component: KpiCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'Fixed-height (100px) metric card with animated count-up, optional trend ' +
          'delta, and a colored left-border accent. Used in a 4-card grid at the top ' +
          'of the dashboard. Set `invertTrend` for metrics where "down" is good ' +
          '(e.g. false-positive rate).',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: { type: 'number', min: 0, max: 10000 } },
    unit: { control: 'text' },
    trend: { control: { type: 'number', min: -50, max: 50, step: 0.1 } },
    accentColor: {
      control: 'select',
      options: ['pass', 'fail', 'warning', 'info', 'magna'],
    },
    loading: { control: 'boolean' },
    decimals: { control: { type: 'number', min: 0, max: 3 } },
    invertTrend: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Total Tests',
    value: 500,
    accentColor: 'magna',
    icon: Activity,
  },
};

export const PositiveTrend: Story = {
  args: {
    label: 'Pass Rate',
    value: 78.4,
    unit: '%',
    trend: 2.3,
    accentColor: 'pass',
    decimals: 1,
    icon: Target,
  },
  parameters: {
    docs: {
      description: {
        story: 'Green up-arrow indicates the metric improved vs prior 7d.',
      },
    },
  },
};

export const NegativeTrend: Story = {
  args: {
    label: 'Pass Rate',
    value: 72.1,
    unit: '%',
    trend: -3.4,
    accentColor: 'fail',
    decimals: 1,
    icon: Target,
  },
};

export const InvertedTrend: Story = {
  args: {
    label: 'False Positive Rate',
    value: 1.2,
    unit: '%',
    trend: -0.4,
    accentColor: 'warning',
    decimals: 1,
    invertTrend: true,
    icon: TrendingDown,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`invertTrend: true` flips the color logic so a *decrease* reads as green ' +
          '(improvement). Use for metrics like FPR, latency, or regression count.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    label: 'Mean Detection Distance',
    value: 0,
    accentColor: 'info',
    loading: true,
  },
};

export const Error: Story = {
  args: {
    label: 'Pass Rate',
    value: 0,
    unit: '%',
    accentColor: 'pass',
    error: new window.Error('Failed to fetch /api/stats (503)'),
    icon: Target,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shown when the underlying fetch fails. The value slot renders a ' +
          'fail-red AlertCircle + em-dash placeholder, and a "Failed to load" ' +
          'sub-label replaces the trend row. Hover the icon for the full error ' +
          'message.',
      },
    },
  },
};

export const AccentPass: Story = {
  args: { label: 'Passing Runs', value: 392, accentColor: 'pass', icon: Target },
};

export const AccentFail: Story = {
  args: { label: 'Failing Runs', value: 68, accentColor: 'fail', icon: Activity },
};

export const AccentWarning: Story = {
  args: { label: 'Warnings', value: 40, accentColor: 'warning', icon: Activity },
};

export const AccentMagna: Story = {
  args: { label: 'Total Tests', value: 500, accentColor: 'magna', icon: Activity },
};

export const WithIcon: Story = {
  args: {
    label: 'Mean Distance',
    value: 84.2,
    unit: 'm',
    trend: 1.1,
    accentColor: 'info',
    decimals: 1,
    icon: Gauge,
  },
};

/** Shows how four KPI cards pack into the dashboard's top row. */
export const DashboardRow: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4" style={{ width: 1000 }}>
      <KpiCard label="Total Tests" value={500} accentColor="magna" icon={Activity} />
      <KpiCard
        label="Pass Rate"
        value={78.4}
        unit="%"
        trend={2.3}
        accentColor="pass"
        decimals={1}
        icon={Target}
      />
      <KpiCard
        label="Mean Distance"
        value={84.2}
        unit="m"
        trend={-1.1}
        accentColor="info"
        decimals={1}
        icon={Gauge}
      />
      <KpiCard
        label="False Positive Rate"
        value={1.2}
        unit="%"
        trend={-0.4}
        accentColor="warning"
        decimals={1}
        invertTrend
        icon={TrendingDown}
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Reference composition from `app/page.tsx`: four KPIs in a responsive grid, ' +
          'using `magna`, `pass`, `info`, and `warning` accents plus one inverted trend.',
      },
    },
  },
};
