'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption<V extends string> {
  value: V;
  label: string;
}

interface FilterDropdownProps<V extends string> {
  label: string;
  value: V | undefined;
  options: FilterOption<V>[];
  onChange: (next: V | undefined) => void;
  placeholder?: string;
}

/**
 * Styled native <select> wrapped in a pill — picks accessibility over
 * custom listbox complexity. "All" option maps to undefined.
 */
export function FilterDropdown<V extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
}: FilterDropdownProps<V>) {
  const active = value !== undefined;

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as V | undefined)}
        className={cn(
          'h-9 appearance-none rounded-md border bg-surface-card pl-3 pr-8 text-xs font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
          'transition-colors',
          active
            ? 'border-magna-red/30 text-ink-primary'
            : 'border-hairline text-ink-secondary hover:border-hairline hover:text-ink-primary',
        )}
        aria-label={label}
      >
        <option value="">
          {label}: {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-muted"
        aria-hidden
      />
    </label>
  );
}
