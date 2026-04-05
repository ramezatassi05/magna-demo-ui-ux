'use client';

/**
 * useAgentChat — custom React hook that streams SSE events from the
 * Next.js proxy at POST /api/chat (which in turn proxies FastAPI) and
 * folds them into a typed message list.
 *
 * Mirrors Vercel AI SDK's useChat API surface (messages, input,
 * handleInputChange, handleSubmit, stop, status) but consumes our
 * backend's custom AgentEvent union directly — this keeps per-message
 * rich attachments (charts, tables, test cases) typed and ordered
 * without a translation layer.
 *
 * See lib/types.ts for the AgentEvent discriminated union; see
 * api/agent.py for the backend event schema (both are kept in sync).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import type {
  AgentAttachment,
  AgentEvent,
  ChatMessage,
  ToolCall,
} from '@/lib/types';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface UiUserMessage {
  id: string;
  role: 'user';
  content: string;
}

export interface UiAssistantMessage {
  id: string;
  role: 'assistant';
  text: string;
  thinking: string[];
  toolCalls: ToolCall[];
  attachments: AgentAttachment[];
  doneMeta?: { duration_ms: number; tool_calls: number };
  errored?: { message: string };
}

export type UiMessage = UiUserMessage | UiAssistantMessage;

export type ChatStatus = 'idle' | 'streaming' | 'error';

export interface UseAgentChatResult {
  messages: UiMessage[];
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  handleSubmit: (e?: FormEvent, overridePrompt?: string) => Promise<void>;
  submitPrompt: (prompt: string) => void;
  stop: () => void;
  status: ChatStatus;
  error: Error | null;
}

/** Default chips shown in the empty state. */
export const SUGGESTED_PROMPTS = [
  'Show failed tests this week',
  'Compare sensor pass rates',
  'Generate AEB test cases',
  "What's trending in failures?",
] as const;

// -----------------------------------------------------------------------------
// SSE parser — async generator that yields one AgentEvent per frame
// -----------------------------------------------------------------------------

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line (\n\n).
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        // A frame may contain multiple `data:` lines per spec; join them.
        const dataLines = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart());
        if (dataLines.length === 0) continue;

        try {
          yield JSON.parse(dataLines.join('\n')) as AgentEvent;
        } catch {
          // skip malformed frames rather than tear down the whole stream
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// -----------------------------------------------------------------------------
// Event reducer — pure, returns a new assistant message
// -----------------------------------------------------------------------------

function applyEvent(msg: UiAssistantMessage, ev: AgentEvent): UiAssistantMessage {
  switch (ev.type) {
    case 'thinking':
      return { ...msg, thinking: [...msg.thinking, ev.message] };

    case 'tool_call':
      return {
        ...msg,
        toolCalls: [
          ...msg.toolCalls,
          {
            id: ev.tool_call_id,
            name: ev.tool_name,
            args: ev.args,
            status: 'running',
          },
        ],
      };

    case 'tool_result':
      return {
        ...msg,
        toolCalls: msg.toolCalls.map((tc) =>
          tc.id === ev.tool_call_id
            ? { ...tc, status: ev.status, preview: ev.preview }
            : tc,
        ),
      };

    case 'text':
      return { ...msg, text: msg.text + ev.delta };

    case 'table':
      return {
        ...msg,
        attachments: [
          ...msg.attachments,
          {
            kind: 'table',
            data: {
              title: ev.title,
              columns: ev.columns,
              rows: ev.rows,
              total_rows: ev.total_rows,
              truncated: ev.truncated,
            },
          },
        ],
      };

    case 'chart':
      return {
        ...msg,
        attachments: [
          ...msg.attachments,
          {
            kind: 'chart',
            data: {
              chart_type: ev.chart_type,
              title: ev.title,
              x_key: ev.x_key,
              y_keys: ev.y_keys,
              data: ev.data,
              series_colors: ev.series_colors,
            },
          },
        ],
      };

    case 'test_cases':
      return {
        ...msg,
        attachments: [
          ...msg.attachments,
          {
            kind: 'test_cases',
            data: {
              requirement: ev.requirement,
              feature: ev.feature,
              cases: ev.cases,
            },
          },
        ],
      };

    case 'done':
      return {
        ...msg,
        doneMeta: { duration_ms: ev.duration_ms, tool_calls: ev.tool_calls },
      };

    case 'error':
      return { ...msg, errored: { message: ev.message } };

    default:
      return msg;
  }
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Maps UI messages to the backend ChatMessage[] shape. Skips empty bodies. */
function toBackendHistory(messages: UiMessage[]): ChatMessage[] {
  return messages
    .map<ChatMessage | null>((m) => {
      if (m.role === 'user') return { role: 'user', content: m.content };
      if (m.text) return { role: 'assistant', content: m.text };
      return null;
    })
    .filter((m): m is ChatMessage => m !== null);
}

export function useAgentChat(): UseAgentChatResult {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // Refs mirror state so long-lived callbacks avoid stale closures.
  const messagesRef = useRef<UiMessage[]>(messages);
  const statusRef = useRef<ChatStatus>(status);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Abort any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setInput(e.target.value);
    },
    [],
  );

  const runQuery = useCallback(async (prompt: string): Promise<void> => {
    if (!prompt.trim() || statusRef.current === 'streaming') return;

    const userMsg: UiUserMessage = {
      id: makeId(),
      role: 'user',
      content: prompt,
    };
    const assistantId = makeId();
    const assistantSeed: UiAssistantMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      thinking: [],
      toolCalls: [],
      attachments: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantSeed]);
    setStatus('streaming');
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Build history from *prior* messages + the new user turn.
      const history = toBackendHistory([...messagesRef.current, userMsg]);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, session_id: null }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      for await (const ev of parseSseStream(res.body, controller.signal)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === 'assistant'
              ? applyEvent(m, ev)
              : m,
          ),
        );
        if (ev.type === 'done' || ev.type === 'error') break;
      }
      setStatus('idle');
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('idle');
        return;
      }
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e?: FormEvent, overridePrompt?: string): Promise<void> => {
      e?.preventDefault();
      const prompt = (overridePrompt ?? input).trim();
      if (!prompt) return;
      setInput('');
      await runQuery(prompt);
    },
    [input, runQuery],
  );

  const submitPrompt = useCallback(
    (prompt: string): void => {
      setInput('');
      void runQuery(prompt);
    },
    [runQuery],
  );

  const stop = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submitPrompt,
    stop,
    status,
    error,
  };
}
