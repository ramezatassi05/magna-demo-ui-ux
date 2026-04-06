'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartData } from '@/lib/types';

interface InlineChartProps {
  data: ChartData;
}

// Dark-theme axis/tooltip styling to match the chat panel surface.
const AXIS_STYLE = {
  fontSize: 10,
  fill: '#9CA3AF',
  fontFamily: 'var(--font-jetbrains-mono)',
};

const TOOLTIP_STYLE = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  fontSize: 11,
  color: '#F3F4F6',
  boxShadow: '0 4px 12px rgba(0,0,0,0.32)',
} as const;

// Fallback palette when series_colors isn't provided.
const DEFAULT_PALETTE = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

/**
 * Compact Recharts visualization rendered inline in the chat bubble.
 * Routes by chart_type; dark-mode styled to contrast the message body.
 */
export function InlineChart({ data }: InlineChartProps) {
  return (
    <div className="rounded-sm border border-white/5 bg-surface-elevated p-3 animate-fade-in">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        {data.title}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        {renderChart(data)}
      </ResponsiveContainer>
    </div>
  );
}

function colorFor(
  key: string,
  seriesColors: ChartData['series_colors'],
  index: number,
): string {
  return (
    seriesColors?.[key] ??
    DEFAULT_PALETTE[index % DEFAULT_PALETTE.length] ??
    '#8B5CF6'
  );
}

function renderChart(data: ChartData): React.ReactElement {
  const { chart_type, x_key, y_keys, data: rows, series_colors } = data;

  if (chart_type === 'line') {
    return (
      <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey={x_key}
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_STYLE}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#F3F4F6', fontWeight: 600 }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
          iconType="circle"
          iconSize={6}
        />
        {y_keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colorFor(key, series_colors, i)}
            strokeWidth={2}
            dot={false}
            name={key}
          />
        ))}
      </LineChart>
    );
  }

  if (chart_type === 'donut') {
    const valueKey = y_keys[0];
    if (!valueKey) return <div />;
    return (
      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#F3F4F6' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10 }}
          iconType="circle"
          iconSize={6}
          verticalAlign="bottom"
        />
        <Pie
          data={rows}
          dataKey={valueKey}
          nameKey={x_key}
          cx="50%"
          cy="45%"
          innerRadius={36}
          outerRadius={60}
          paddingAngle={2}
        >
          {rows.map((row, i) => (
            <Cell
              key={i}
              fill={colorFor(String(row[x_key]), series_colors, i)}
            />
          ))}
        </Pie>
      </PieChart>
    );
  }

  // bar + stacked-bar
  const stacked = chart_type === 'stacked-bar';
  return (
    <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="rgba(255,255,255,0.06)"
        vertical={false}
      />
      <XAxis
        dataKey={x_key}
        tick={AXIS_STYLE}
        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        tickLine={false}
      />
      <YAxis
        tick={AXIS_STYLE}
        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        tickLine={false}
        allowDecimals={false}
      />
      <Tooltip
        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        contentStyle={TOOLTIP_STYLE}
        labelStyle={{ color: '#F3F4F6', fontWeight: 600 }}
      />
      <Legend
        wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
        iconType="circle"
        iconSize={6}
      />
      {y_keys.map((key, i) => (
        <Bar
          key={key}
          dataKey={key}
          stackId={stacked ? 'a' : undefined}
          fill={colorFor(key, series_colors, i)}
          name={key}
          radius={
            stacked && i === y_keys.length - 1
              ? [3, 3, 0, 0]
              : !stacked
                ? [3, 3, 0, 0]
                : [0, 0, 0, 0]
          }
        />
      ))}
    </BarChart>
  );
}
