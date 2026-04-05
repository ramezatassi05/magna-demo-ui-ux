'use client';

import { useEffect, useRef } from 'react';

import type { ChatStatus, UiMessage } from '@/hooks/use-agent-chat';
import { AssistantMessageBubble } from './assistant-message-bubble';
import { UserMessageBubble } from './user-message-bubble';

interface ChatMessagesProps {
  messages: UiMessage[];
  status: ChatStatus;
}

/**
 * Scrolling message list. Auto-scrolls to the bottom on new content
 * only if the user is already near the bottom, so we don't yank them
 * away while they're reading older messages.
 */
export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // Track whether user is at the bottom BEFORE next render.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    wasAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // After messages update, scroll to bottom only if user was already there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.id;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 space-y-3 overflow-y-auto px-5 py-6 dark-scroll"
      aria-live="polite"
      aria-busy={status === 'streaming'}
    >
      {messages.map((m) =>
        m.role === 'user' ? (
          <UserMessageBubble key={m.id} content={m.content} />
        ) : (
          <AssistantMessageBubble
            key={m.id}
            message={m}
            isActive={status === 'streaming' && m.id === lastAssistantId}
          />
        ),
      )}
    </div>
  );
}
