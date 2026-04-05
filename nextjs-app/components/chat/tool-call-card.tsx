'use client';

import { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Database,
  FileCode2,
  Sigma,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ToolCall, ToolName } from '@/lib/types';
import {
  EngineeringMetadata,
  type MetadataItem,
} from '@/components/industrial/engineering-metadata';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

/** Extract lightweight metadata from the tool call args/preview. */
function deriveToolMetadata(toolCall: ToolCall): MetadataItem[] {
  const items: MetadataItem[] = [];
  const args = toolCall.args ?? {};

  // Surface common numeric args (limit, count, page_size) as metadata.
  const NUMERIC_KEYS = ['limit', 'count', 'page_size', 'days'] as const;
  for (const key of NUMERIC_KEYS) {
    const v = args[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      items.push({ label: key, value: String(v) });
      if (items.length >= 2) break;
    }
  }

  return items;
}

const TOOL_ICONS: Record<ToolName, LucideIcon> = {
  query_tests: Database,
  generate_chart_data: BarChart3,
  generate_test_cases: FileCode2,
  summarize_results: Sigma,
};

const TOOL_LABELS: Record<ToolName, string> = {
  query_tests: 'query_tests',
  generate_chart_data: 'generate_chart_data',
  generate_test_cases: 'generate_test_cases',
  summarize_results: 'summarize_results',
};

/**
 * Collapsible card showing a single tool invocation. Closed view: icon +
 * name + status dot. Expanded view: pretty-printed input args + result
 * preview. Animates in on mount via animate-fade-in.
 */
export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[toolCall.name];
  const metadata = deriveToolMetadata(toolCall);

  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-surface-elevated animate-fade-in">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
          'hover:bg-white/[0.02]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agent-thinking/40',
        )}
      >
        <Icon
          className="h-3.5 w-3.5 text-agent-thinking"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] text-ink-on-dark">
          {TOOL_LABELS[toolCall.name]}
        </span>
        <StatusDot status={toolCall.status} />
        {metadata.length > 0 && (
          <EngineeringMetadata
            items={metadata}
            align="end"
            className="ml-auto !text-[9px]"
          />
        )}
        <ChevronDown
          className={cn(
            'h-3 w-3 text-ink-muted transition-transform',
            metadata.length === 0 && 'ml-auto',
            expanded && 'rotate-180',
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-white/5 px-3 py-2">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Input
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-ink-on-dark/80">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.preview && (
            <div>
              <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Result
              </div>
              <div className="font-mono text-[10px] leading-snug text-ink-on-dark/80">
                {toolCall.preview}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: ToolCall['status'] }) {
  const label = {
    running: 'Running',
    ok: 'Completed',
    error: 'Failed',
  }[status];
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'running' && 'bg-agent-thinking animate-agent-pulse',
        status === 'ok' && 'bg-agent-success',
        status === 'error' && 'bg-status-fail',
      )}
      role="status"
      aria-label={label}
    />
  );
}
