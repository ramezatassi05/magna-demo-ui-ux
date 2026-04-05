'use client';

import { useState, type FormEvent } from 'react';

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
import {
  resolvePresetFilters,
  useScopingPresetsStore,
  type ScopingPreset,
} from '@/lib/stores/scoping-presets-store';
import type { TestFilters } from '@/lib/types';
import { cn } from '@/lib/utils';

import { IndustrialIcon } from './industrial-icon';

/**
 * ScopingPresets — horizontal chip rack of saved filter scopes.
 *
 * Wraps Magna's built-in triage queries + user-saved presets. Clicking a
 * chip resolves its (possibly dynamic) filters via `resolvePresetFilters`
 * and hands them off to the consumer via `onApply`. The consumer is
 * responsible for pushing those filters to URL / state — the store only
 * tracks which preset is active.
 *
 * User-created presets (non-builtin) expose a delete affordance on hover
 * that opens an AlertDialog for confirmation. Built-ins cannot be deleted.
 */

interface ScopingPresetsProps {
  /** Called with resolved filters when a preset is clicked. */
  onApply: (filters: Partial<TestFilters>) => void;
  /** Current filter state — feeds the "save current" form. */
  currentFilters: Partial<TestFilters>;
  className?: string;
}

export function ScopingPresets({
  onApply,
  currentFilters,
  className,
}: ScopingPresetsProps) {
  const presets = useScopingPresetsStore((s) => s.presets);
  const activePresetId = useScopingPresetsStore((s) => s.activePresetId);
  const applyPreset = useScopingPresetsStore((s) => s.applyPreset);
  const addPreset = useScopingPresetsStore((s) => s.addPreset);
  const deletePreset = useScopingPresetsStore((s) => s.deletePreset);

  const handleApply = (preset: ScopingPreset) => {
    const resolved = resolvePresetFilters(preset);
    applyPreset(preset.id);
    onApply(resolved);
  };

  return (
    <div
      role="toolbar"
      aria-label="Saved filter scopes"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {presets.map((preset) => (
        <PresetChip
          key={preset.id}
          preset={preset}
          active={preset.id === activePresetId}
          onApply={handleApply}
          onDelete={deletePreset}
        />
      ))}
      <SaveCurrentChip
        currentFilters={currentFilters}
        onSave={(name) =>
          addPreset({ name, filters: currentFilters, iconName: 'Bookmark' })
        }
      />
    </div>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────

interface PresetChipProps {
  preset: ScopingPreset;
  active: boolean;
  onApply: (preset: ScopingPreset) => void;
  onDelete: (id: string) => void;
}

function PresetChip({ preset, active, onApply, onDelete }: PresetChipProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        role="button"
        aria-pressed={active}
        onClick={() => onApply(preset)}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 font-mono text-[11px] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
          active
            ? 'border-magna-red bg-magna-red/5 text-ink-primary'
            : 'border-hairline bg-surface-card text-ink-secondary hover:border-ink-muted hover:text-ink-primary',
          !preset.builtin && 'pr-7',
        )}
      >
        {preset.iconName && (
          <IndustrialIcon name={preset.iconName} size="xs" tone="inherit" />
        )}
        <span>{preset.name}</span>
      </button>
      {!preset.builtin && (
        <DeletePresetButton
          presetName={preset.name}
          onConfirm={() => onDelete(preset.id)}
        />
      )}
    </div>
  );
}

// ── Delete button w/ confirmation ──────────────────────────────────────

interface DeletePresetButtonProps {
  presetName: string;
  onConfirm: () => void;
}

function DeletePresetButton({
  presetName,
  onConfirm,
}: DeletePresetButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Delete preset ${presetName}`}
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-sm text-ink-muted',
            'opacity-0 transition-opacity hover:bg-state-critical-bg hover:text-state-critical',
            'group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-state-critical',
          )}
        >
          <IndustrialIcon name="Reject" size="xs" tone="inherit" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete preset?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{presetName}&rdquo;? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Save-current chip ──────────────────────────────────────────────────

interface SaveCurrentChipProps {
  currentFilters: Partial<TestFilters>;
  onSave: (name: string) => void;
}

function SaveCurrentChip({ currentFilters, onSave }: SaveCurrentChipProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const hasFilters = Object.keys(currentFilters).length > 0;
  const canSave = name.trim().length > 0 && hasFilters;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave(name.trim());
    setName('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Save current filters as preset"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-sm border border-dashed border-hairline bg-transparent px-2.5 font-mono text-[11px] text-ink-muted transition-colors',
            'hover:border-magna-red hover:text-magna-red',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
          )}
        >
          <IndustrialIcon name="Bookmark" size="xs" tone="inherit" />
          <span>Save current</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="preset-name"
              className="font-mono text-[10px] uppercase tracking-widest text-ink-muted"
            >
              Preset name
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. radar daytime pass"
              className={cn(
                'mt-1 block w-full rounded-sm border border-hairline bg-surface-card px-2 py-1.5 font-mono text-[12px] text-ink-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-0',
                'placeholder:text-ink-muted/60',
              )}
              autoFocus
            />
          </div>
          {!hasFilters && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Apply some filters first, then save.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setName('');
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!canSave}
            >
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
