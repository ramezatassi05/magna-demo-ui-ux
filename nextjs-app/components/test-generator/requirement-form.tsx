'use client';

import { Sparkles } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Feature } from '@/lib/types';

export interface RequirementFormValues {
  requirement: string;
  feature: Feature | 'auto';
  count: number;
}

interface RequirementFormProps {
  values: RequirementFormValues;
  onChange: (next: RequirementFormValues) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const FEATURES: Array<{ value: Feature; label: string }> = [
  { value: 'AEB', label: 'AEB — Autonomous Emergency Braking' },
  { value: 'FCW', label: 'FCW — Forward Collision Warning' },
  { value: 'LCA', label: 'LCA — Lane Change Assist' },
  { value: 'BSD', label: 'BSD — Blind Spot Detection' },
  { value: 'ACC', label: 'ACC — Adaptive Cruise Control' },
  { value: 'TSR', label: 'TSR — Traffic Sign Recognition' },
];

const EXAMPLES: Array<{ feature: Feature; text: string }> = [
  {
    feature: 'AEB',
    text: 'AEB shall detect pedestrians at ≥50m in daylight with ≤0.1% FPR',
  },
  {
    feature: 'FCW',
    text: 'FCW shall warn driver ≥2.5s before potential collision using camera-radar fusion',
  },
  {
    feature: 'BSD',
    text: 'BSD shall detect vehicles in adjacent lane within 70m using radar at all speeds ≥30km/h',
  },
  {
    feature: 'TSR',
    text: 'TSR shall recognize speed limit signs at ≥100m in daylight and ≥50m at night',
  },
];

/** Left-column input: requirement textarea, feature select, count slider, presets. */
export function RequirementForm({
  values,
  onChange,
  onSubmit,
  disabled = false,
}: RequirementFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled && values.requirement.trim()) onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // ⌘+Enter / Ctrl+Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && values.requirement.trim()) onSubmit();
    }
  };

  const applyExample = (example: (typeof EXAMPLES)[number]) => {
    onChange({
      ...values,
      requirement: example.text,
      feature: example.feature,
    });
  };

  const canSubmit = !disabled && values.requirement.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-card border border-hairline bg-surface-card p-5 shadow-card"
    >
      {/* Requirement textarea */}
      <div>
        <label
          htmlFor="requirement"
          className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary"
        >
          Requirement
        </label>
        <textarea
          id="requirement"
          value={values.requirement}
          onChange={(e) => onChange({ ...values, requirement: e.target.value })}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={5}
          placeholder="e.g., The AEB system shall detect pedestrians at ≥50m in daylight conditions with ≤0.1% false positive rate"
          className={cn(
            'mt-1.5 block w-full resize-y rounded-sm border border-hairline bg-surface-card px-3 py-2.5 text-sm text-ink-primary',
            'placeholder:text-ink-muted',
            'focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        />
        <p className="mt-1 font-mono text-[10px] text-ink-muted">
          ⌘+Enter to generate
        </p>
      </div>

      {/* Feature select + count slider */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="feature"
            className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary"
          >
            Feature
          </label>
          <select
            id="feature"
            value={values.feature}
            onChange={(e) =>
              onChange({
                ...values,
                feature: e.target.value as Feature | 'auto',
              })
            }
            disabled={disabled}
            className={cn(
              'mt-1.5 block w-full rounded-sm border border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary',
              'focus:border-magna-red focus:outline-none focus:ring-1 focus:ring-magna-red',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <option value="auto">Auto-detect from text</option>
            {FEATURES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="count"
            className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-secondary"
          >
            Count
            <span className="font-mono text-sm font-medium normal-case tracking-normal text-ink-primary">
              {values.count}
            </span>
          </label>
          <input
            id="count"
            type="range"
            min={1}
            max={10}
            step={1}
            value={values.count}
            onChange={(e) =>
              onChange({ ...values, count: Number(e.target.value) })
            }
            disabled={disabled}
            className="mt-3 block w-full accent-magna-red disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-muted">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!canSubmit}
        className="w-full"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
        {disabled ? 'Generating…' : 'Generate Test Cases'}
      </Button>

      {/* Example pills */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-secondary">
          Example Requirements
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.text}
              type="button"
              onClick={() => applyExample(ex)}
              disabled={disabled}
              className={cn(
                'group flex items-start gap-2 rounded-sm border border-hairline bg-surface-base px-2.5 py-2 text-left text-[12px] text-ink-secondary',
                'transition-colors hover:border-magna-red/30 hover:bg-magna-red/5 hover:text-ink-primary',
                'focus-visible:outline-none focus-visible:border-magna-red focus-visible:ring-1 focus-visible:ring-magna-red',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface-base disabled:hover:border-hairline disabled:hover:text-ink-secondary',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-4 shrink-0 items-center rounded-sm bg-magna-red/10 px-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-magna-red',
                )}
              >
                {ex.feature}
              </span>
              <span className="leading-snug">{ex.text}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
