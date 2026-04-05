'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Table2,
  Wand2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/results', label: 'Test Results', icon: Table2 },
  { href: '/test-generator', label: 'Test Generator', icon: Wand2 },
];

interface SidebarNavProps {
  chatOpen: boolean;
  onToggleChat: () => void;
}

export function SidebarNav({ chatOpen, onToggleChat }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-sidebar flex-col bg-surface-dark">
      {/* Logo — Magna red accent bar + brand mark */}
      <div className="relative border-b border-white/5 px-6 py-5">
        <div className="absolute bottom-5 left-0 top-5 w-1 rounded-r bg-magna-red" />
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          Magna · R&amp;D
        </div>
        <div className="mt-1 font-mono text-[15px] font-semibold leading-tight text-ink-on-dark">
          ADAS Test Agent
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 dark-scroll" aria-label="Primary">
        <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Overview
        </div>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex h-11 items-center gap-3 rounded-md pr-3 text-sm transition-colors',
                    isActive
                      ? 'border-l-[3px] border-magna-red bg-white/[0.02] pl-[13px] text-ink-on-dark'
                      : 'pl-4 text-ink-muted hover:bg-white/[0.04] hover:text-ink-on-dark',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Engineering metadata footer */}
      <div className="metadata-strip border-t border-white/5 px-6 pb-2 pt-3">
        build v4.2.1 · env prod · api /v1
      </div>

      {/* Bottom — AI Agent toggle */}
      <div className="border-t border-white/5 p-3">
        <button
          type="button"
          onClick={onToggleChat}
          aria-pressed={chatOpen}
          aria-label={chatOpen ? 'Close AI Agent panel' : 'Open AI Agent panel'}
          className={cn(
            'flex h-11 w-full items-center gap-3 rounded-md pl-4 pr-3 text-sm font-medium transition-colors',
            chatOpen
              ? 'bg-surface-elevated text-ink-on-dark'
              : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink-on-dark',
          )}
        >
          <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2} />
          <span>AI Agent</span>
          <span
            className={cn(
              'ml-auto h-1.5 w-1.5 rounded-full',
              chatOpen ? 'bg-agent-success animate-agent-pulse' : 'bg-agent-idle',
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </aside>
  );
}
