import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  IndustrialIcon,
  type IndustrialIconName,
  type IndustrialIconTone,
} from '../../components/industrial/industrial-icon';

const ALL_NAMES: IndustrialIconName[] = [
  'Safety',
  'Warning',
  'Critical',
  'Maintenance',
  'Threshold',
  'Filter',
  'Override',
  'Stop',
  'Confirm',
  'Reject',
  'Retry',
  'Why',
  'Reasoning',
  'Trace',
  'Bookmark',
  'Database',
  'Empty',
  'Chart',
  'Sensor',
  'TestCase',
  'Csv',
  'Json',
];

const ALL_TONES: IndustrialIconTone[] = [
  'critical',
  'anomaly',
  'override',
  'nominal',
  'brand',
  'muted',
  'inherit',
];

const meta: Meta<typeof IndustrialIcon> = {
  title: 'Industrial/IndustrialIcon',
  component: IndustrialIcon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single source of truth for iconography. All Magna-pattern surfaces route ' +
          'through this wrapper to enforce stroke-width 2, consistent sizing, and ' +
          'design-token-backed tones. Raw `lucide-react` imports are disallowed in ' +
          '`components/industrial/**` via ESLint.',
      },
    },
  },
  argTypes: {
    name: { control: 'select', options: ALL_NAMES },
    size: { control: 'radio', options: ['xs', 'sm', 'md', 'lg'] },
    tone: { control: 'select', options: ALL_TONES },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: 'Safety', size: 'md', tone: 'brand' },
};

export const AllIcons: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-6 p-4">
      {ALL_NAMES.map((name) => (
        <div
          key={name}
          className="flex flex-col items-center gap-1.5 rounded border border-hairline bg-surface-card p-3"
        >
          <IndustrialIcon name={name} size="md" tone="brand" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {name}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <IndustrialIcon name="Safety" size={size} tone="brand" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {size}
          </span>
        </div>
      ))}
    </div>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {ALL_TONES.map((tone) => (
        <div key={tone} className="flex flex-col items-center gap-1">
          <IndustrialIcon name="Critical" size="lg" tone={tone} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {tone}
          </span>
        </div>
      ))}
    </div>
  ),
};
