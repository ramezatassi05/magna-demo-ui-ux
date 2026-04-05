import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ApprovalButton } from '../components/approval-button';
import type { ApprovalStatus } from '../lib/types';

const meta: Meta<typeof ApprovalButton> = {
  title: 'Components/ApprovalButton',
  component: ApprovalButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Human-in-the-loop control attached to each AI-generated test case. ' +
          'Runs in either **uncontrolled** mode (internal state machine: pending → ' +
          'approved/rejected → pending via Undo) or **controlled** mode, where the ' +
          'parent tracks the status for export filtering and feeds it back via ' +
          '`status` + `onStatusChange`.',
      },
    },
    a11y: {
      config: {
        rules: [{ id: 'button-name', enabled: true }],
      },
    },
  },
  argTypes: {
    testId: { control: 'text' },
    status: {
      control: 'select',
      options: [undefined, 'approved', 'rejected'],
      description: 'Controlled status. Omit for uncontrolled mode.',
    },
    onApprove: { action: 'approved' },
    onReject: { action: 'rejected' },
    onStatusChange: { action: 'statusChange' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[260px] rounded-card border border-hairline bg-surface-card p-4 shadow-card">
    <p className="mb-3 text-xs text-ink-secondary">
      TC-AEB-0001 — Pedestrian crossing, night
    </p>
    {children}
  </div>
);

/** Uncontrolled — internal state toggles on click. */
export const Pending: Story = {
  args: { testId: 'TC-AEB-0001' },
  render: (args) => (
    <Container>
      <ApprovalButton {...args} />
    </Container>
  ),
};

export const Approved: Story = {
  args: { testId: 'TC-AEB-0001', status: 'approved' },
  render: (args) => (
    <Container>
      <ApprovalButton {...args} />
    </Container>
  ),
};

export const Rejected: Story = {
  args: { testId: 'TC-AEB-0001', status: 'rejected' },
  render: (args) => (
    <Container>
      <ApprovalButton {...args} />
    </Container>
  ),
};

/** Controlled — parent holds state via `useState`. */
export const Controlled: Story = {
  args: { testId: 'TC-AEB-0002' },
  render: (args) => {
    const [status, setStatus] = useState<ApprovalStatus>(null);
    return (
      <Container>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Status: {status ?? 'pending'}
        </p>
        <ApprovalButton
          {...args}
          status={status}
          onStatusChange={(_id, next) => setStatus(next)}
        />
      </Container>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Parent component owns `status` via `useState`. Each click emits ' +
          '`onStatusChange(testId, next)` which the parent mirrors back into the prop.',
      },
    },
  },
};
