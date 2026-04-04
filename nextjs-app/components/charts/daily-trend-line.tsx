'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { TrendPoint } from '@/lib/types';

interface DailyTrendLineProps {
  trends: TrendPoint[];
  days?: number;
}

const AXIS_STYLE = { fontSize: 11, fill: '#6B7280', fontFamily: 'var(--font-jetbrains-mono)' };

export function DailyTrendLine({ trends, days = 30 }: DailyTrendLineProps) {
  const data = trends.slice(-days);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_STYLE}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
          tickFormatter={(v) => {
            try {
              return format(parseISO(v), 'MMM d');
            } catch {
              return v;
            }
          }}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
        />
        <YAxis
          tick={AXIS_STYLE}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelFormatter={(v: string) => {
            try {
              return format(parseISO(v), 'MMM d, yyyy');
            } catch {
              return v;
            }
          }}
          labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="fail"
          name="Fail"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="warning"
          name="Warning"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
