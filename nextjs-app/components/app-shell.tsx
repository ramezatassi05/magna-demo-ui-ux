'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { AgentChatPanel } from './agent-chat-panel';
import { SidebarNav } from './sidebar-nav';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Client shell for the app — owns chat-panel open/close state so the root
 * layout.tsx can remain a server component. Composes:
 *
 *   ┌─────────┬──────────────────────────────┬────────────┐
 *   │ Sidebar │ Main content (page children) │ Chat panel │
 *   │ 260px   │ flex-1, padding 24, max-1440 │ 400px      │
 *   │ fixed   │                              │ slides in  │
 *   └─────────┴──────────────────────────────┴────────────┘
 */
export function AppShell({ children }: AppShellProps) {
  const [chatOpen, setChatOpen] = useState(false);

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base">
      <SidebarNav chatOpen={chatOpen} onToggleChat={toggleChat} />

      <main className="ml-sidebar min-h-screen">
        <div className="mx-auto max-w-content px-6 py-6">{children}</div>
      </main>

      <AgentChatPanel open={chatOpen} onClose={closeChat} />
    </div>
  );
}
