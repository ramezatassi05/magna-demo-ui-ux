'use client';

import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/lib/stores/simulation-store';
import { cn } from '@/lib/utils';

import { IndustrialIcon } from './industrial-icon';

/**
 * SimulatedRibbon — banner shown across the top of the Dashboard while
 * a "what-if" simulation is live. Surfaces the active override params
 * and a one-click Exit that resets the store back to defaults.
 *
 * Renders nothing (null) when the simulation store is inactive so the
 * component can sit permanently in the layout without gating.
 */

interface SimulatedRibbonProps {
  className?: string;
}

export function SimulatedRibbon({ className }: SimulatedRibbonProps) {
  const isActive = useSimulationStore((s) => s.isActive);
  const params = useSimulationStore((s) => s.params);
  const reset = useSimulationStore((s) => s.reset);
  const deactivate = useSimulationStore((s) => s.deactivate);

  if (!isActive) return null;

  const handleExit = () => {
    deactivate();
    reset();
  };

  const formattedParams = [
    `min conf ${Math.round(params.min_confidence * 100)}%`,
    `max FPR ${(params.max_fpr * 100).toFixed(1)}%`,
    `min range ${params.min_distance}m`,
  ].join(' · ');

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full items-center gap-3 border-b border-state-override-border bg-state-override-bg px-4 py-2',
        className,
      )}
    >
      <IndustrialIcon name="Override" size="sm" tone="override" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-state-override">
        Simulated
      </span>
      <span className="font-mono text-[11px] text-state-override/80 tabular-nums">
        {formattedParams}
      </span>
      <Button
        type="button"
        variant="override"
        size="sm"
        onClick={handleExit}
        className="ml-auto"
      >
        Exit simulation
      </Button>
    </div>
  );
}
