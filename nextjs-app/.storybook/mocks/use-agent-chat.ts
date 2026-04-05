/**
 * Storybook mock for `@/hooks/use-agent-chat`.
 *
 * The real hook opens an SSE stream to /api/chat, which doesn't exist inside
 * the Storybook preview iframe. This mock returns the same result shape but
 * reads its state from a mutable global set by stories via a decorator.
 *
 * Usage (inside a story file):
 *
 *   import { setMockAgentChat } from '../.storybook/mocks/use-agent-chat';
 *   setMockAgentChat({ messages: [...], status: 'streaming' });
 *
 * or via a decorator that calls setMockAgentChat(...) before rendering.
 */

import {
  useCallback,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import type { UiMessage, UseAgentChatResult, ChatStatus } from '../../hooks/use-agent-chat';

// Re-export so consumers importing from '@/hooks/use-agent-chat' get the same
// public types as the real module.
export type {
  UiMessage,
  UiUserMessage,
  UiAssistantMessage,
  UseAgentChatResult,
  ChatStatus,
} from '../../hooks/use-agent-chat';

export const SUGGESTED_PROMPTS = [
  'Show failed tests this week',
  'Compare sensor pass rates',
  'Generate AEB test cases',
  "What's trending in failures?",
] as const;

// -----------------------------------------------------------------------------
// Mutable fixture store — stories write to this before mount, the hook reads
// from it on every render.
// -----------------------------------------------------------------------------

interface MockAgentChatState {
  messages: UiMessage[];
  status: ChatStatus;
  error: Error | null;
}

let currentMock: MockAgentChatState = {
  messages: [],
  status: 'idle',
  error: null,
};

export function setMockAgentChat(next: Partial<MockAgentChatState>): void {
  currentMock = { ...currentMock, ...next };
}

export function resetMockAgentChat(): void {
  currentMock = { messages: [], status: 'idle', error: null };
}

// -----------------------------------------------------------------------------
// Mock hook — returns the live-ish shape the real component consumes.
// -----------------------------------------------------------------------------

export function useAgentChat(): UseAgentChatResult {
  const [input, setInput] = useState('');

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent): Promise<void> => {
      e?.preventDefault();
      // No-op in Storybook — mutating messages would drift from the
      // fixture the story set up, obscuring the intended variant.
      setInput('');
    },
    [],
  );

  const submitPrompt = useCallback((_prompt: string): void => {
    setInput('');
  }, []);

  const stop = useCallback((): void => {
    // no-op
  }, []);

  return {
    messages: currentMock.messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submitPrompt,
    stop,
    status: currentMock.status,
    error: currentMock.error,
  };
}
