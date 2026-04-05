import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DecisionTrace } from '../../components/industrial/decision-trace';
import type { ToolCall } from '../../lib/types';

const meta: Meta<typeof DecisionTrace> = {
  title: 'Industrial/DecisionTrace',
  component: DecisionTrace,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'Tree-structured reasoning trace for the chat panel. Interleaves ' +
          'thinking[] and toolCalls[] into a zipper-merged tree; each tool ' +
          "step owns its result preview as a 'finding' child. Falls back to " +
          'ThinkingIndicator when no tool calls have arrived yet. Arrow keys ' +
          'navigate the tree (Up/Down between siblings, Left/Right to ' +
          'collapse/expand or move to parent/child, Home/End for bounds).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[420px] bg-surface-elevated p-3">{children}</div>
);

export const NoTools_Fallback: Story = {
  render: () => (
    <Wrapper>
      <DecisionTrace
        thinking={['Checking test corpus', 'Filtering by sensor']}
        toolCalls={[]}
        active={true}
      />
    </Wrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Falls back to ThinkingIndicator when toolCalls is empty — ' +
          'expected during early stream ticks.',
      },
    },
  },
};

const runningToolCalls: ToolCall[] = [
  {
    id: 'tc-1',
    name: 'query_tests',
    args: { sensor_type: 'thermal', result: 'fail' },
    status: 'ok',
    preview: 'Returned 12 matching records',
  },
  {
    id: 'tc-2',
    name: 'generate_chart_data',
    args: { type: 'bar' },
    status: 'running',
  },
];

export const RunningWithTools: Story = {
  render: () => (
    <Wrapper>
      <DecisionTrace
        thinking={[
          'Need to find thermal failures first',
          'Now building chart data for distribution',
        ]}
        toolCalls={runningToolCalls}
        active={true}
      />
    </Wrapper>
  ),
};

const completedToolCalls: ToolCall[] = [
  {
    id: 'tc-1',
    name: 'query_tests',
    args: { sensor_type: 'thermal', result: 'fail' },
    status: 'ok',
    preview: '12 records returned. Distribution: AEB 8, FCW 3, LCA 1.',
  },
  {
    id: 'tc-2',
    name: 'summarize_results',
    args: { tests: 12 },
    status: 'ok',
    preview: 'Pass rate dropped from 92% to 84% in last 24h',
  },
];

export const CompletedWithFindings: Story = {
  render: () => (
    <Wrapper>
      <DecisionTrace
        thinking={[
          'User is asking about thermal failures',
          'Found 12 records - need to summarize',
        ]}
        toolCalls={completedToolCalls}
        active={false}
      />
    </Wrapper>
  ),
};

const errorToolCalls: ToolCall[] = [
  {
    id: 'tc-1',
    name: 'query_tests',
    args: { sensor_type: 'unknown' },
    status: 'error',
    preview: 'Invalid sensor_type value',
  },
];

export const ErrorStep: Story = {
  render: () => (
    <Wrapper>
      <DecisionTrace
        thinking={['Parsing user query']}
        toolCalls={errorToolCalls}
        active={false}
      />
    </Wrapper>
  ),
};
