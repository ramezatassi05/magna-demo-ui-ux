/**
 * AgentChatPanel tests.
 *
 * The real `useAgentChat` hook opens an SSE stream to /api/chat, which is
 * not appropriate in a unit test. We intercept `@/hooks/use-agent-chat` with
 * `vi.mock()` and drive the panel by swapping the mocked return value
 * between tests. This isolates the panel's own concerns — slide animation,
 * aria visibility, delegating to ChatEmptyState / ChatMessages / ChatInput,
 * and the error banner — from streaming state management.
 *
 * Note: `vi.mock` calls are hoisted above imports by Vitest.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  UiMessage,
  UseAgentChatResult,
  ChatStatus,
} from '@/hooks/use-agent-chat';

// The mocked hook needs to be re-configurable per test, so it reads from a
// mutable module-scoped object. Tests call `setMockChat(...)` before render.
let currentMockChat: UseAgentChatResult;

function makeDefaultChat(): UseAgentChatResult {
  return {
    messages: [],
    input: '',
    setInput: vi.fn(),
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    submitPrompt: vi.fn(),
    stop: vi.fn(),
    status: 'idle' as ChatStatus,
    error: null,
  };
}

vi.mock('@/hooks/use-agent-chat', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-agent-chat')>(
    '@/hooks/use-agent-chat',
  );
  return {
    ...actual,
    useAgentChat: () => currentMockChat,
  };
});

import { AgentChatPanel } from '@/components/agent-chat-panel';

beforeEach(() => {
  currentMockChat = makeDefaultChat();
});

describe('AgentChatPanel', () => {
  it('renders suggested prompts when messages are empty', () => {
    render(<AgentChatPanel open onClose={vi.fn()} />);

    expect(screen.getByText('How can I help?')).toBeInTheDocument();

    // All 4 default SUGGESTED_PROMPTS chips from the hook
    expect(screen.getByText('Show failed tests this week')).toBeInTheDocument();
    expect(screen.getByText('Compare sensor pass rates')).toBeInTheDocument();
    expect(screen.getByText('Generate AEB test cases')).toBeInTheDocument();
    expect(screen.getByText("What's trending in failures?")).toBeInTheDocument();

    // The chips live inside a role="list" with an accessible name
    const list = screen.getByRole('list', { name: /suggested prompts/i });
    expect(list).toBeInTheDocument();
  });

  it('calls submitPrompt when a suggested prompt chip is clicked', async () => {
    const user = userEvent.setup();
    const submitPrompt = vi.fn();
    currentMockChat = { ...makeDefaultChat(), submitPrompt };

    render(<AgentChatPanel open onClose={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: /show failed tests this week/i }),
    );
    expect(submitPrompt).toHaveBeenCalledWith('Show failed tests this week');
  });

  it('shows a thinking indicator while streaming the first assistant turn', () => {
    const streamingMessages: UiMessage[] = [
      { id: 'u1', role: 'user', content: 'Hello' },
      {
        id: 'a1',
        role: 'assistant',
        text: '',
        thinking: [],
        toolCalls: [],
        attachments: [],
      },
    ];
    currentMockChat = {
      ...makeDefaultChat(),
      messages: streamingMessages,
      status: 'streaming',
    };

    render(<AgentChatPanel open onClose={vi.fn()} />);

    // The ThinkingIndicator renders a "Thinking" label with a pulsing dot
    // when the assistant has no text/tool calls yet.
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  it('renders user and assistant message bubbles when messages exist', () => {
    currentMockChat = {
      ...makeDefaultChat(),
      messages: [
        { id: 'u1', role: 'user', content: 'What is the pass rate?' },
        {
          id: 'a1',
          role: 'assistant',
          text: 'The pass rate is 78%.',
          thinking: [],
          toolCalls: [],
          attachments: [],
          doneMeta: { duration_ms: 1500, tool_calls: 2 },
        },
      ],
      status: 'idle',
    };

    render(<AgentChatPanel open onClose={vi.fn()} />);
    expect(screen.getByText('What is the pass rate?')).toBeInTheDocument();
    expect(screen.getByText('The pass rate is 78%.')).toBeInTheDocument();
    // doneMeta footer: "2 tool calls · 1.5s"
    expect(screen.getByText(/2 tool calls/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();
  });

  it('applies translate-x-full and aria-hidden=true when closed', () => {
    render(<AgentChatPanel open={false} onClose={vi.fn()} />);
    const panel = screen.getByLabelText('AI Agent chat panel');
    expect(panel).toHaveClass('translate-x-full');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies translate-x-0 and aria-hidden=false when open', () => {
    render(<AgentChatPanel open onClose={vi.fn()} />);
    const panel = screen.getByLabelText('AI Agent chat panel');
    expect(panel).toHaveClass('translate-x-0');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AgentChatPanel open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close chat panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the transport error banner when error is non-null', () => {
    currentMockChat = {
      ...makeDefaultChat(),
      error: new Error('Network refused'),
    };
    render(<AgentChatPanel open onClose={vi.fn()} />);
    expect(screen.getByText('Request failed')).toBeInTheDocument();
    expect(screen.getByText('Network refused')).toBeInTheDocument();
  });

  it('submits the input through handleSubmit when user clicks Send', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    currentMockChat = {
      ...makeDefaultChat(),
      input: 'Hello agent',
      handleSubmit,
    };
    render(<AgentChatPanel open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(handleSubmit).toHaveBeenCalled();
  });
});
