'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toDonutData } from '@/lib/aggregations';

interface ResultDonutProps {
  counts: Record<string, number>;
}

export function ResultDonut({ counts }: ResultDonutProps) {
  const data = toDonutData(counts);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={64}
            outerRadius={94}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-ink-primary tabular-nums">
          {total.toLocaleString()}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink-secondary">
          Total runs
        </span>
      </div>

      {/* Legend with percentages */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: d.color }}
              aria-hidden
            />
            <span className="text-ink-secondary">{d.label}</span>
            <span className="font-mono text-ink-primary tabular-nums">
              {total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
