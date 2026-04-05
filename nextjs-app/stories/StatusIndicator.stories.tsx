import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatusIndicator } from '../components/status-indicator';

const meta: Meta<typeof StatusIndicator> = {
  title: 'Components/StatusIndicator',
  component: StatusIndicator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Colored dot (+ optional label) indicating the runtime state of the AI agent. ' +
          '`thinking` pulses purple, `idle` is gray, `success` is green, and `error` is red. ' +
          'Use anywhere the user needs to know whether the agent is working on something — ' +
          'chat headers, tool cards, sidebar toggles.',
      },
    },
  },
  argTypes: {
    state: {
      control: 'radio',
      options: ['thinking', 'idle', 'success', 'error'],
    },
    size: { control: 'radio', options: ['sm', 'md'] },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Thinking: Story = {
  args: { state: 'thinking', label: 'Thinking…' },
  parameters: {
    docs: {
      description: {
        story: 'The dot pulses (purple `agent-pulse` animation) while the agent is working.',
      },
    },
  },
};

export const Idle: Story = {
  args: { state: 'idle', label: 'Idle' },
};

export const Success: Story = {
  args: { state: 'success', label: 'Completed' },
};

export const Error: Story = {
  args: { state: 'error', label: 'Failed' },
};

export const WithoutLabel: Story = {
  args: { state: 'thinking' },
};

export const SmallSize: Story = {
  args: { state: 'thinking', label: 'Running', size: 'sm' },
};

/** Side-by-side reference of all four states. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusIndicator state="thinking" label="Thinking…" />
      <StatusIndicator state="idle" label="Idle" />
      <StatusIndicator state="success" label="Completed" />
      <StatusIndicator state="error" label="Failed" />
    </div>
  ),
};
