import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AnomalyAlertBadge } from '../../components/industrial/anomaly-alert-badge';

const meta: Meta<typeof AnomalyAlertBadge> = {
  title: 'Industrial/AnomalyAlertBadge',
  component: AnomalyAlertBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'State-rule alert indicator using Magna daylight-readable tokens. ' +
          'Three variants: **standalone** (pill above charts / in task cards), ' +
          '**inline-row** (4px left strip on table rows), **kpi-corner** (dot on KpiCard). ' +
          'Pulsing is restricted to `critical` severity by default — restraint prevents ' +
          'attention-fatigue on the factory floor.',
      },
    },
  },
  argTypes: {
    severity: { control: 'radio', options: ['critical', 'anomaly', 'watch'] },
    variant: { control: 'radio', options: ['standalone', 'inline-row', 'kpi-corner'] },
    pulsing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Critical: Story = {
  args: { severity: 'critical', label: 'FPR BREACH', value: '+0.8pp' },
};

export const Anomaly: Story = {
  args: { severity: 'anomaly', label: 'FAIL RATE SPIKE', value: '+12%' },
};

export const Watch: Story = {
  args: { severity: 'watch', label: 'APPROACHING THRESHOLD' },
};

export const StandaloneVariants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <AnomalyAlertBadge severity="critical" label="FPR BREACH" value="+0.8pp" />
      <AnomalyAlertBadge severity="anomaly" label="FAIL RATE SPIKE" value="+12%" />
      <AnomalyAlertBadge severity="watch" label="APPROACHING THRESHOLD" />
    </div>
  ),
};

export const InlineRowStrip: Story = {
  render: () => (
    <div className="w-80 rounded-sm border border-hairline bg-surface-card">
      {[
        { severity: 'critical' as const, text: 'TC-00042 · Thermal AEB · 42m fail' },
        { severity: 'anomaly' as const, text: 'TC-00043 · Camera FCW · FPR 4.8%' },
        { severity: 'watch' as const, text: 'TC-00044 · Radar ACC · drift' },
      ].map((row, i) => (
        <div
          key={i}
          className="relative flex h-9 items-center border-b border-hairline-subtle pl-4 pr-3 font-mono text-[12px] text-ink-primary last:border-b-0"
        >
          <AnomalyAlertBadge
            severity={row.severity}
            variant="inline-row"
            tooltip={`${row.severity} anomaly detected`}
          />
          {row.text}
        </div>
      ))}
    </div>
  ),
};

export const KpiCornerDot: Story = {
  render: () => (
    <div className="relative h-24 w-64 rounded-card border border-hairline bg-surface-card p-4">
      <AnomalyAlertBadge
        severity="critical"
        variant="kpi-corner"
        tooltip="False positive rate crossed 3% threshold"
      />
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        FALSE POSITIVE RATE
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold text-ink-primary">
        3.42<span className="text-base font-normal text-ink-muted">%</span>
      </div>
    </div>
  ),
};

export const NoPulse: Story = {
  args: { severity: 'critical', label: 'CRITICAL', pulsing: false },
  parameters: {
    docs: {
      description: {
        story: 'Critical severity with pulsing explicitly disabled — used in dense lists.',
      },
    },
  },
};
