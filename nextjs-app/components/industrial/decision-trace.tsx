'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { ThinkingIndicator } from '@/components/chat/thinking-indicator';
import { buildTrace, type TraceStep } from '@/lib/chat/build-trace';
import type { ToolCall } from '@/lib/types';
import { cn } from '@/lib/utils';

import {
  IndustrialIcon,
  type IndustrialIconName,
  type IndustrialIconTone,
} from './industrial-icon';

/**
 * DecisionTrace — tree-structured reasoning display for the chat panel.
 *
 * Zipper-merges `thinking` and `toolCalls` into a TraceStep tree via
 * `buildTrace`, then renders it as an ARIA tree with arrow-key
 * navigation. Tool calls own their preview as a nested finding child,
 * giving the user a real reasoning structure rather than a flat spinner.
 *
 * Falls back to `ThinkingIndicator` when there are no tool calls yet —
 * early stream ticks only contain reasoning messages.
 */

interface DecisionTraceProps {
  thinking: string[];
  toolCalls: ToolCall[];
  active: boolean;
  className?: string;
}

const TOOL_ICON_MAP: Record<string, IndustrialIconName> = {
  query_tests: 'Database',
  generate_chart_data: 'Chart',
  generate_test_cases: 'TestCase',
  summarize_results: 'Reasoning',
};

const TOOL_LABEL_MAP: Record<string, string> = {
  query_tests: 'Query tests',
  generate_chart_data: 'Generate chart',
  generate_test_cases: 'Generate test cases',
  summarize_results: 'Summarize results',
};

function getStepIcon(
  step: TraceStep,
): { name: IndustrialIconName; tone: IndustrialIconTone } {
  if (step.kind === 'reasoning') {
    return { name: 'Reasoning', tone: 'muted' };
  }
  if (step.kind === 'finding') {
    return { name: 'Trace', tone: 'muted' };
  }
  // tool
  const name: IndustrialIconName = step.toolName
    ? (TOOL_ICON_MAP[step.toolName] ?? 'Trace')
    : 'Trace';
  const tone: IndustrialIconTone =
    step.status === 'error'
      ? 'critical'
      : step.status === 'ok'
        ? 'nominal'
        : 'muted';
  return { name, tone };
}

function formatStepLabel(step: TraceStep): string {
  if (step.kind === 'tool' && step.toolName) {
    return TOOL_LABEL_MAP[step.toolName] ?? step.toolName;
  }
  return step.label;
}

interface FlatItem {
  id: string;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
}

export function DecisionTrace({
  thinking,
  toolCalls,
  active,
  className,
}: DecisionTraceProps) {
  const trace = useMemo(
    () => buildTrace(thinking, toolCalls),
    [thinking, toolCalls],
  );

  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const didNavigate = useRef(false);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // Flatten trace into visible items for keyboard nav.
  const visibleItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const step of trace) {
      const hasChildren = !!step.children && step.children.length > 0;
      items.push({ id: step.id, depth: 0, parentId: null, hasChildren });
      if (hasChildren && !collapsed.has(step.id) && step.children) {
        for (const child of step.children) {
          items.push({
            id: child.id,
            depth: 1,
            parentId: step.id,
            hasChildren: false,
          });
        }
      }
    }
    return items;
  }, [trace, collapsed]);

  // Initialize focus on first visible item once.
  useEffect(() => {
    if (focusedId === null && visibleItems.length > 0) {
      const first = visibleItems[0];
      if (first) setFocusedId(first.id);
    }
  }, [visibleItems, focusedId]);

  // Move actual DOM focus when user has navigated via keyboard.
  useEffect(() => {
    if (!didNavigate.current || !focusedId) return;
    itemRefs.current.get(focusedId)?.focus();
  }, [focusedId]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      if (!focusedId) return;
      const idx = visibleItems.findIndex((i) => i.id === focusedId);
      if (idx === -1) return;
      const item = visibleItems[idx];
      if (!item) return;
      const expanded = item.hasChildren && !collapsed.has(item.id);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          didNavigate.current = true;
          const next = visibleItems[idx + 1];
          if (next) setFocusedId(next.id);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          didNavigate.current = true;
          const prev = visibleItems[idx - 1];
          if (prev) setFocusedId(prev.id);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          didNavigate.current = true;
          if (item.hasChildren && !expanded) {
            toggleCollapse(item.id);
          } else if (item.hasChildren) {
            const firstChild = visibleItems[idx + 1];
            if (firstChild && firstChild.parentId === item.id) {
              setFocusedId(firstChild.id);
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          didNavigate.current = true;
          if (expanded) {
            toggleCollapse(item.id);
          } else if (item.parentId) {
            setFocusedId(item.parentId);
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          didNavigate.current = true;
          const first = visibleItems[0];
          if (first) setFocusedId(first.id);
          break;
        }
        case 'End': {
          e.preventDefault();
          didNavigate.current = true;
          const last = visibleItems[visibleItems.length - 1];
          if (last) setFocusedId(last.id);
          break;
        }
      }
    },
    [focusedId, visibleItems, collapsed, toggleCollapse],
  );

  // Fallback when no tools yet — compose ThinkingIndicator.
  if (toolCalls.length === 0) {
    return <ThinkingIndicator messages={thinking} active={active} />;
  }

  const stepCount = visibleItems.length;
  const label = active
    ? `Thinking · ${stepCount} step${stepCount === 1 ? '' : 's'}`
    : `Reasoning · ${stepCount} step${stepCount === 1 ? '' : 's'}`;

  return (
    <div
      className={cn(
        'rounded-lg border border-white/5 bg-surface-elevated/60',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
          'hover:bg-white/[0.02]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agent-thinking/40',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-2 w-2 rounded-full bg-agent-thinking',
            active && 'animate-agent-pulse',
          )}
        />
        <span className="font-mono text-[11px] text-ink-muted">{label}</span>
        <IndustrialIcon
          name="ChevronDown"
          size="xs"
          tone="muted"
          className={cn(
            'ml-auto transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul
          role="tree"
          aria-label="Agent reasoning"
          onKeyDown={handleKeyDown}
          className="border-t border-white/5 px-2 py-1.5"
        >
          {trace.map((step) => (
            <TraceStepNode
              key={step.id}
              step={step}
              depth={0}
              parentId={null}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              itemRefs={itemRefs}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── TraceStepNode ──────────────────────────────────────────────────────

interface TraceStepNodeProps {
  step: TraceStep;
  depth: number;
  parentId: string | null;
  focusedId: string | null;
  setFocusedId: (id: string) => void;
  collapsed: Set<string>;
  toggleCollapse: (id: string) => void;
  itemRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
}

function TraceStepNode({
  step,
  depth,
  focusedId,
  setFocusedId,
  collapsed,
  toggleCollapse,
  itemRefs,
}: TraceStepNodeProps) {
  const hasChildren = !!step.children && step.children.length > 0;
  const expanded = hasChildren && !collapsed.has(step.id);
  const isFocused = focusedId === step.id;
  const icon = getStepIcon(step);
  const label = formatStepLabel(step);
  const fontSize = step.kind === 'finding' ? 'text-[10px]' : 'text-[11px]';

  return (
    <li
      ref={(el) => {
        if (el) itemRefs.current.set(step.id, el);
        else itemRefs.current.delete(step.id);
      }}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1}
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
      onClick={(e) => {
        e.stopPropagation();
        setFocusedId(step.id);
      }}
      className={cn(
        'flex cursor-default flex-col rounded-sm py-1',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-agent-thinking/40',
        isFocused && 'bg-white/[0.02]',
      )}
    >
      <div
        className={cn('flex items-start gap-1.5', depth === 1 && 'pl-4')}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(step.id);
            }}
            className="mt-0.5 inline-flex h-3 w-3 items-center justify-center text-ink-muted"
          >
            <IndustrialIcon
              name={expanded ? 'ChevronDown' : 'ChevronRight'}
              size="xs"
              tone="inherit"
            />
          </button>
        ) : (
          <span className="inline-block h-3 w-3 shrink-0" />
        )}
        <IndustrialIcon
          name={icon.name}
          size="xs"
          tone={icon.tone}
          className="mt-0.5"
        />
        <span
          className={cn(
            'flex-1 break-words font-mono leading-relaxed text-ink-on-dark',
            fontSize,
          )}
        >
          {label}
          {step.kind === 'tool' && step.status === 'error' && (
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-widest text-state-critical">
              error
            </span>
          )}
        </span>
      </div>
      {hasChildren && expanded && step.children && (
        <ul role="group" className="mt-1">
          {step.children.map((child) => (
            <TraceStepNode
              key={child.id}
              step={child}
              depth={depth + 1}
              parentId={step.id}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              itemRefs={itemRefs}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
