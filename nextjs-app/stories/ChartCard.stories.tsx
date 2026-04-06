import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChartCard } from '../components/chart-card';
import { DailyTrendLine } from '../components/charts/daily-trend-line';
import { ResultDonut } from '../components/charts/result-donut';
import { SensorResultsBar } from '../components/charts/sensor-results-bar';
import { aggregateBySensorResult } from '../lib/aggregations';
import { MOCK_DONUT_COUNTS, MOCK_TEST_RECORDS, MOCK_TREND_DATA } from '../.storybook/mocks/fixtures';

const meta: Meta<typeof ChartCard> = {
  title: 'Components/ChartCard',
  component: ChartCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'White card wrapper used for every dashboard chart and mini-table. Handles ' +
          'its own loading skeleton and error-with-retry states so each chart child can ' +
          'focus on rendering data. Pass a `headerRight` node (filter pill, legend toggle) ' +
          'to annotate the card title.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    loading: { control: 'boolean' },
    minHeight: { control: { type: 'number', min: 120, max: 400 } },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithBarChart: Story = {
  args: {
    title: 'Results by sensor',
    description: 'Stacked counts for the last 30 days',
  },
  render: (args) => (
    <ChartCard {...args}>
      <SensorResultsBar data={aggregateBySensorResult(MOCK_TEST_RECORDS)} />
    </ChartCard>
  ),
};

export const WithLineChart: Story = {
  args: {
    title: 'Daily failures',
    description: 'Fail + warning trend over the last 30 days',
  },
  render: (args) => (
    <ChartCard {...args}>
      <DailyTrendLine trends={MOCK_TREND_DATA} days={30} />
    </ChartCard>
  ),
};

export const WithDonutChart: Story = {
  args: {
    title: 'Result distribution',
    description: 'Pass / fail / warning share',
  },
  render: (args) => (
    <ChartCard {...args}>
      <ResultDonut counts={MOCK_DONUT_COUNTS} />
    </ChartCard>
  ),
};

export const Loading: Story = {
  args: {
    title: 'Results by sensor',
    description: 'Fetching latest data…',
    loading: true,
  },
  render: (args) => (
    <ChartCard {...args}>
      <div />
    </ChartCard>
  ),
};

export const ErrorWithRetry: Story = {
  args: {
    title: 'Daily failures',
    description: 'Fail + warning trend over the last 30 days',
    error: new Error('FetchError: /api/stats/trends returned 503'),
  },
  render: (args) => (
    <ChartCard
      {...args}
      onRetry={() => {
        console.log('retry clicked');
      }}
    >
      <div />
    </ChartCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Error state with a Retry button wired to `onRetry`. The error message (from ' +
          '`error.message`) is shown verbatim — backend errors must be user-friendly.',
      },
    },
  },
};

export const WithHeaderRight: Story = {
  args: {
    title: 'Daily failures',
    description: 'Last 14 days',
  },
  render: (args) => (
    <ChartCard
      {...args}
      headerRight={
        <span className="inline-flex h-6 items-center rounded-sm border border-hairline bg-surface-card px-2 font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
          14d
        </span>
      }
    >
      <DailyTrendLine trends={MOCK_TREND_DATA} days={14} />
    </ChartCard>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The `headerRight` slot hosts quick filters, range toggles, or export actions.',
      },
    },
  },
};
