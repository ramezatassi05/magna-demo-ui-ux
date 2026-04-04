'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SensorBreakdownRow } from '@/lib/aggregations';

interface SensorResultsBarProps {
  data: SensorBreakdownRow[];
}

const AXIS_STYLE = { fontSize: 11, fill: '#6B7280', fontFamily: 'var(--font-jetbrains-mono)' };

export function SensorResultsBar({ data }: SensorResultsBarProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="sensorLabel"
          tick={AXIS_STYLE}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_STYLE}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: '#F3F4F6' }}
          contentStyle={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="pass" stackId="a" fill="#10B981" name="Pass" radius={[0, 0, 0, 0]} />
        <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="Warning" />
        <Bar dataKey="fail" stackId="a" fill="#EF4444" name="Fail" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
