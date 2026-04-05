import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AgentChatPanel } from '../components/agent-chat-panel';
import {
  resetMockAgentChat,
  setMockAgentChat,
} from '../.storybook/mocks/use-agent-chat';
import {
  MOCK_CHAT_MESSAGES_EMPTY,
  MOCK_CHAT_MESSAGES_WITH_RESPONSES,
  MOCK_CHAT_THINKING,
  MOCK_CHAT_WITH_CHART,
} from '../.storybook/mocks/fixtures';

const meta: Meta<typeof AgentChatPanel> = {
  title: 'Components/AgentChatPanel',
  component: AgentChatPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'Slide-out chat surface (400px, dark themed) pinned to the right edge of the ' +
          'viewport. Wraps `<ChatEmptyState>`, `<ChatMessages>`, and `<ChatInput>` and ' +
          'owns the streaming state via `useAgentChat`. In Storybook the hook is ' +
          'swapped for a fixture-driven mock so stories stay deterministic without ' +
          'hitting the real `/api/chat` endpoint.',
      },
    },
  },
  args: {
    open: true,
  },
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'close' },
  },
  decorators: [
    (Story) => (
      <div className="relative h-screen w-screen bg-surface-content">
        <div className="absolute left-6 top-6 max-w-md text-sm text-ink-secondary">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider">
            Main content area (placeholder)
          </p>
          <p>
            The chat panel slides in from the right. Use the controls panel to
            toggle it open / closed and see the CSS transition.
          </p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyWithPrompts: Story = {
  args: { open: true },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      setMockAgentChat({ messages: MOCK_CHAT_MESSAGES_EMPTY, status: 'idle' });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'First-open state — no messages yet. Suggested prompt chips nudge the user ' +
          "toward canned queries ('Show failed tests this week', etc.).",
      },
    },
  },
};

export const WithMessages: Story = {
  args: { open: true },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      setMockAgentChat({
        messages: MOCK_CHAT_MESSAGES_WITH_RESPONSES,
        status: 'idle',
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'One completed user → assistant exchange with an inline data table attachment ' +
          'and visible tool-call card.',
      },
    },
  },
};

export const Thinking: Story = {
  args: { open: true },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      setMockAgentChat({ messages: MOCK_CHAT_THINKING, status: 'streaming' });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Mid-stream — the purple pulse indicates the agent is reasoning. A running ' +
          'tool call is visible with status=running.',
      },
    },
  },
};

export const WithInlineChart: Story = {
  args: { open: true },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      setMockAgentChat({ messages: MOCK_CHAT_WITH_CHART, status: 'idle' });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Assistant response with an inline bar chart rendered directly in the bubble. ' +
          'Demonstrates the "never show raw JSON" principle — structured tool output is ' +
          'always rendered as a visualization.',
      },
    },
  },
};

export const WithError: Story = {
  args: { open: true },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      setMockAgentChat({
        messages: MOCK_CHAT_MESSAGES_EMPTY,
        status: 'error',
        error: new Error('Connection lost — failed to reach /api/chat'),
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Transport-level error surfaces as a red banner above the input. Per-message ' +
          'stream errors render inline in the assistant bubble instead.',
      },
    },
  },
};

export const Closed: Story = {
  args: { open: false },
  decorators: [
    (Story) => {
      resetMockAgentChat();
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'With `open=false` the panel is still mounted (so chat state persists) but ' +
          'slid off-screen via `translate-x-full`.',
      },
    },
  },
};
