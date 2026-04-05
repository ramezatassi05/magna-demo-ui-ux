import type { TestRecord } from '@/lib/types';
import { formatDateLong, formatDistance, formatPercent } from '@/lib/format';
import { explainRow } from '@/lib/operations';
import { ConfidenceMeter } from './industrial/confidence-meter';
import { WhyPopover } from './industrial/why-popover';
import { EngineeringMetadata } from './industrial/engineering-metadata';

interface TestResultsRowDetailProps {
  row: TestRecord;
}

interface Metric {
  label: string;
  value: string;
  mono?: boolean;
}

export function TestResultsRowDetail({ row }: TestResultsRowDetailProps) {
  const metrics: Metric[] = [
    { label: 'Detection Distance', value: formatDistance(row.detection_distance_m), mono: true },
    { label: 'False Positive Rate', value: formatPercent(row.false_positive_rate * 100, 3), mono: true },
    { label: 'Execution Time', value: `${row.execution_time_ms} ms`, mono: true },
    { label: 'Firmware', value: row.firmware_version, mono: true },
    { label: 'Vehicle Model', value: row.vehicle_model, mono: true },
    { label: 'Confidence', value: `${(row.confidence_score * 100).toFixed(1)}%`, mono: true },
  ];

  return (
    <div
      role="region"
      aria-label={`Details for ${row.test_id}`}
      className="bg-[#FAFBFC] border-t border-hairline px-6 py-4 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-secondary mb-1">
            Scenario
          </p>
          <p className="text-sm text-ink-primary">{row.scenario}</p>
          {row.scenario_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.scenario_tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex h-5 items-center rounded-full border border-hairline bg-surface-card px-2 text-[10px] font-mono text-ink-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <ConfidenceMeter
          score={row.confidence_score}
          size="md"
          label="Detection confidence"
          showValue
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between border-b border-hairline-subtle py-1.5">
            <dt className="text-[11px] uppercase tracking-wider font-medium text-ink-secondary">
              {m.label}
            </dt>
            <dd className={m.mono ? 'font-mono text-xs text-ink-primary' : 'text-xs text-ink-primary'}>
              {m.value}
            </dd>
          </div>
        ))}
      </dl>

      {row.notes && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-secondary">
              Engineering Notes
            </p>
            <WhyPopover
              title="Why this result"
              subtitle={row.test_id}
              dataPoints={explainRow(row)}
              align="start"
              side="bottom"
            />
          </div>
          <p className="text-[13px] italic text-ink-secondary">{row.notes}</p>
        </div>
      )}

      <EngineeringMetadata
        items={[
          { label: 'run', value: row.test_id },
          { label: 'firmware', value: row.firmware_version },
          { label: 'vehicle', value: row.vehicle_model },
          { label: 'ts', value: formatDateLong(row.timestamp) },
        ]}
        align="start"
        className="border-t border-hairline-subtle pt-3"
      />
    </div>
  );
}
