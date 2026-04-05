'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useThrottledValue } from '@/lib/hooks/use-throttled-value';
import {
  DEFAULT_SIM_PARAMS,
  type SimulationParams,
} from '@/lib/simulations';
import { useSimulationStore } from '@/lib/stores/simulation-store';
import { cn } from '@/lib/utils';

import { ConfirmationFlash } from './motion-primitives';
import { IndustrialIcon } from './industrial-icon';

/**
 * ParameterSliderPanel — "what-if" threshold sliders for the Dashboard.
 *
 * Wires three sliders (min confidence, max FPR, min detection range) to
 * the simulation store. Dragging any slider auto-activates simulation
 * mode (SimulatedRibbon appears at the top of the dashboard); Reset
 * restores defaults and deactivates.
 *
 * Local state drives the Radix slider (60fps), throttled via rAF before
 * syncing to the store to keep downstream KPI/chart recomputes at frame-
 * rate instead of per-pointer-event.
 */

interface ParameterSliderPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

const fmtConfidence = (v: number) => `${Math.round(v * 100)}%`;
const fmtFpr = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtDistance = (v: number) => `${v}m`;

const ariaConfidence = (v: number) => `${Math.round(v * 100)} percent`;
const ariaFpr = (v: number) => `${(v * 100).toFixed(1)} percent`;
const ariaDistance = (v: number) => `${v} meters`;

export function ParameterSliderPanel({
  open,
  onOpenChange,
  className,
}: ParameterSliderPanelProps) {
  const params = useSimulationStore((s) => s.params);
  const isActive = useSimulationStore((s) => s.isActive);
  const setParam = useSimulationStore((s) => s.setParam);
  const activate = useSimulationStore((s) => s.activate);
  const reset = useSimulationStore((s) => s.reset);

  const [flashKey, setFlashKey] = useState(0);

  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-surface-card',
        className,
      )}
    >
      <ConfirmationFlash triggerKey={flashKey} className="rounded-card">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-2 px-4 py-3 text-left transition-colors',
            'hover:bg-hairline-subtle',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
          )}
        >
          <IndustrialIcon name="Threshold" size="sm" tone="brand" />
          <span className="font-mono text-[13px] font-semibold text-ink-primary">
            Simulate thresholds
          </span>
          {isActive && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-sm border border-state-override-border bg-state-override-bg px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-state-override">
              Active
            </span>
          )}
          <IndustrialIcon
            name="ChevronDown"
            size="md"
            tone="muted"
            className={cn(
              'ml-auto transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {open && (
          <div className="space-y-5 border-t border-hairline px-4 py-4">
            <SliderRow
              storeKey="min_confidence"
              label="Minimum confidence"
              min={0}
              max={1}
              step={0.01}
              storeValue={params.min_confidence}
              setParam={setParam}
              format={fmtConfidence}
              formatAria={ariaConfidence}
              defaultValue={DEFAULT_SIM_PARAMS.min_confidence}
            />
            <SliderRow
              storeKey="max_fpr"
              label="Max false-positive rate"
              min={0}
              max={0.1}
              step={0.001}
              storeValue={params.max_fpr}
              setParam={setParam}
              format={fmtFpr}
              formatAria={ariaFpr}
              defaultValue={DEFAULT_SIM_PARAMS.max_fpr}
            />
            <SliderRow
              storeKey="min_distance"
              label="Min detection range"
              min={0}
              max={100}
              step={1}
              storeValue={params.min_distance}
              setParam={setParam}
              format={fmtDistance}
              formatAria={ariaDistance}
              defaultValue={DEFAULT_SIM_PARAMS.min_distance}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  setFlashKey((k) => k + 1);
                }}
                className="text-ink-secondary hover:text-magna-red"
              >
                <IndustrialIcon name="Retry" size="xs" tone="inherit" />
                Reset
              </Button>
            </div>
          </div>
        )}
      </ConfirmationFlash>
      <AutoActivate
        params={params}
        isActive={isActive}
        activate={activate}
      />
    </div>
  );
}

// ── SliderRow ──────────────────────────────────────────────────────────

interface SliderRowProps {
  storeKey: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step: number;
  storeValue: number;
  setParam: (key: keyof SimulationParams, value: number) => void;
  format: (v: number) => string;
  formatAria: (v: number) => string;
  defaultValue: number;
}

function SliderRow({
  storeKey,
  label,
  min,
  max,
  step,
  storeValue,
  setParam,
  format,
  formatAria,
  defaultValue,
}: SliderRowProps) {
  const [local, setLocal] = useState(storeValue);
  const throttled = useThrottledValue(local);
  // Tracks whether the user has changed the slider since the last
  // externally-driven sync. Prevents a stale `throttled` value from
  // clobbering an external reset.
  const userChangedRef = useRef(false);

  // local → store (only emit when the user actually moved the slider)
  useEffect(() => {
    if (!userChangedRef.current) return;
    if (throttled !== storeValue) {
      setParam(storeKey, throttled);
    }
  }, [throttled, storeValue, storeKey, setParam]);

  // store → local (external reset sync) — clear user-changed flag so
  // any in-flight throttled value is ignored.
  useEffect(() => {
    userChangedRef.current = false;
    setLocal(storeValue);
  }, [storeValue]);

  const dirty = local !== defaultValue;

  const labelId = `sim-label-${storeKey}`;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span
          id={labelId}
          className="font-mono text-[11px] text-ink-secondary"
        >
          {label}
        </span>
        <span
          className={cn(
            'font-mono text-[13px] tabular-nums',
            dirty ? 'font-semibold text-state-override' : 'text-ink-primary',
          )}
        >
          {format(local)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[local]}
        onValueChange={([n]) => {
          userChangedRef.current = true;
          setLocal(n ?? local);
        }}
        aria-labelledby={labelId}
        aria-valuetext={formatAria(local)}
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ── AutoActivate ───────────────────────────────────────────────────────

interface AutoActivateProps {
  params: SimulationParams;
  isActive: boolean;
  activate: () => void;
}

/** Invisible effect component — calls activate() when params leave defaults. */
function AutoActivate({ params, isActive, activate }: AutoActivateProps) {
  useEffect(() => {
    const dirty =
      params.min_confidence !== DEFAULT_SIM_PARAMS.min_confidence ||
      params.max_fpr !== DEFAULT_SIM_PARAMS.max_fpr ||
      params.min_distance !== DEFAULT_SIM_PARAMS.min_distance;
    if (dirty && !isActive) {
      activate();
    }
  }, [
    params.min_confidence,
    params.max_fpr,
    params.min_distance,
    isActive,
    activate,
  ]);
  return null;
}
