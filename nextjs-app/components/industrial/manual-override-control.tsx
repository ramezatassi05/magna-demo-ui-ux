'use client';

import { useRef, useState, type FormEvent } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { IndustrialIcon } from './industrial-icon';

/**
 * ManualOverrideControl — agent takeover strip for the chat panel footer.
 *
 * Three controls:
 *  - **Stop agent**: visible only while streaming; requires AlertDialog
 *    confirmation because in-flight tool calls will be abandoned.
 *  - **Scope**: inject a scope prefix into the next user message (e.g.
 *    "[scope: thermal night fails]"). Routed to the parent via
 *    `onInjectFilter` — parent is responsible for prefixing.
 *  - **Override recommendation**: visible when `lastRecommendation` set;
 *    lets the operator reject the agent's last suggestion.
 *
 * All override events announce via a visually-hidden aria-live region
 * for screen readers. Text is updated imperatively through a ref to
 * avoid full re-renders on every announcement.
 */

interface ManualOverrideControlProps {
  status: 'idle' | 'streaming' | 'error';
  onStop: () => void;
  onInjectFilter?: (filter: string) => void;
  onOverrideRecommendation?: () => void;
  lastRecommendation?: { id: string; summary: string };
  className?: string;
}

export function ManualOverrideControl({
  status,
  onStop,
  onInjectFilter,
  onOverrideRecommendation,
  lastRecommendation,
  className,
}: ManualOverrideControlProps) {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = (msg: string) => {
    if (announceRef.current) {
      // Clear then set so repeated identical messages are still announced
      announceRef.current.textContent = '';
      // rAF to force aria-live to pick up the change
      requestAnimationFrame(() => {
        if (announceRef.current) announceRef.current.textContent = msg;
      });
    }
  };

  const handleStopConfirm = () => {
    onStop();
    announce('Agent stopped');
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-t border-white/5 bg-surface-elevated/40 px-3 py-2',
        className,
      )}
    >
      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        className="sr-only"
      />

      {status === 'streaming' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <IndustrialIcon name="Stop" size="xs" tone="inherit" />
              Stop agent
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Stop agent mid-run?</AlertDialogTitle>
              <AlertDialogDescription>
                Tool calls in progress will be abandoned and partial results
                discarded.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleStopConfirm}>
                Stop agent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <InjectScopePopover
        onInjectFilter={onInjectFilter}
        onAnnounce={announce}
      />

      {lastRecommendation && (
        <OverrideRecommendationPopover
          recommendation={lastRecommendation}
          onOverride={onOverrideRecommendation}
          onAnnounce={announce}
        />
      )}
    </div>
  );
}

// ── InjectScopePopover ────────────────────────────────────────────────

interface InjectScopePopoverProps {
  onInjectFilter?: (filter: string) => void;
  onAnnounce: (msg: string) => void;
}

function InjectScopePopover({
  onInjectFilter,
  onAnnounce,
}: InjectScopePopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onInjectFilter?.(trimmed);
    onAnnounce(`Scope injected: ${trimmed}`);
    setValue('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-ink-on-dark hover:bg-white/[0.04]"
        >
          <IndustrialIcon name="Filter" size="xs" tone="inherit" />
          Scope
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="scope-input"
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted"
            >
              Inject scope into next message
            </label>
            <input
              id="scope-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. thermal night fails"
              className={cn(
                'mt-1 block w-full rounded-sm border border-hairline bg-surface-card px-2 py-1.5 font-mono text-[12px] text-ink-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-0',
                'placeholder:text-ink-muted/60',
              )}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setValue('');
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!value.trim()}
            >
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ── OverrideRecommendationPopover ─────────────────────────────────────

interface OverrideRecommendationPopoverProps {
  recommendation: { id: string; summary: string };
  onOverride?: () => void;
  onAnnounce: (msg: string) => void;
}

function OverrideRecommendationPopover({
  recommendation,
  onOverride,
  onAnnounce,
}: OverrideRecommendationPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleReject = () => {
    onOverride?.();
    onAnnounce('Recommendation overridden');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="override" size="sm">
          <IndustrialIcon name="Override" size="xs" tone="inherit" />
          Override
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Agent recommendation
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-primary">
              {recommendation.summary}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
