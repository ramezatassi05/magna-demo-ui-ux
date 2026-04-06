'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Feature, SensorType, TestFilters, TestResult } from '@/lib/types';
import { Button } from './ui/button';
import { FilterDropdown } from './filter-dropdown';

interface ScenarioFilterProps {
  filters: TestFilters;
  onChange: (next: Partial<TestFilters>) => void;
  onClear: () => void;
  activeCount: number;
}

const SENSOR_OPTIONS: { value: SensorType; label: string }[] = [
  { value: 'camera', label: 'Camera' },
  { value: 'radar', label: 'Radar' },
  { value: 'thermal', label: 'Thermal' },
  { value: 'lidar', label: 'LiDAR' },
];

const RESULT_OPTIONS: { value: TestResult; label: string }[] = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'warning', label: 'Warning' },
];

const FEATURE_OPTIONS: { value: Feature; label: string }[] = [
  { value: 'AEB', label: 'AEB' },
  { value: 'FCW', label: 'FCW' },
  { value: 'LCA', label: 'LCA' },
  { value: 'BSD', label: 'BSD' },
  { value: 'ACC', label: 'ACC' },
  { value: 'TSR', label: 'TSR' },
];

export function ScenarioFilter({
  filters,
  onChange,
  onClear,
  activeCount,
}: ScenarioFilterProps) {
  // Local input state keeps typing responsive; URL updates after 300ms.
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    if ((searchInput || '') === (filters.search ?? '')) return;
    const timer = setTimeout(() => {
      onChange({ search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="rounded-card border border-hairline bg-surface-card p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search scenarios or notes…"
            className={cn(
              'h-9 w-full rounded-sm border border-hairline bg-surface-card pl-8 pr-3 text-xs',
              'placeholder:text-ink-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magna-red focus-visible:ring-offset-1',
            )}
            aria-label="Search scenarios"
          />
        </div>

        <FilterDropdown
          label="Sensor"
          value={filters.sensor_type}
          options={SENSOR_OPTIONS}
          onChange={(v) => onChange({ sensor_type: v })}
        />
        <FilterDropdown
          label="Result"
          value={filters.result}
          options={RESULT_OPTIONS}
          onChange={(v) => onChange({ result: v })}
        />
        <FilterDropdown
          label="Feature"
          value={filters.feature}
          options={FEATURE_OPTIONS}
          onChange={(v) => onChange({ feature: v })}
        />

        {/* Date range */}
        <div className="inline-flex items-center gap-1 rounded-sm border border-hairline bg-surface-card px-2 h-8">
          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) => onChange({ date_from: e.target.value || undefined })}
            className="border-0 bg-transparent text-[11px] font-mono text-ink-primary focus-visible:outline-none"
            aria-label="Date from"
          />
          <span className="text-ink-muted" aria-hidden>
            →
          </span>
          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) => onChange({ date_to: e.target.value || undefined })}
            className="border-0 bg-transparent text-[11px] font-mono text-ink-primary focus-visible:outline-none"
            aria-label="Date to"
          />
        </div>

        {activeCount > 0 && (
          <span className="inline-flex h-6 items-center rounded-full bg-magna-red/10 px-2 text-[11px] font-mono font-medium tabular-nums text-magna-red">
            {activeCount} active
          </span>
        )}

        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      </div>
    </div>
  );
}
