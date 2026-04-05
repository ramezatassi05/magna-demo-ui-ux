import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';

import { SimulatedRibbon } from '../../components/industrial/simulated-ribbon';
import { DEFAULT_SIM_PARAMS } from '../../lib/simulations';
import { useSimulationStore } from '../../lib/stores/simulation-store';

const meta: Meta<typeof SimulatedRibbon> = {
  title: 'Industrial/SimulatedRibbon',
  component: SimulatedRibbon,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-width banner shown when the simulation store is active. ' +
          'Renders null when inactive — safe to mount permanently in the ' +
          'Dashboard layout. Exit button deactivates and resets the store.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function Wrapper({
  active,
  params,
  children,
}: {
  active: boolean;
  params?: typeof DEFAULT_SIM_PARAMS;
  children: React.ReactNode;
}) {
  useEffect(() => {
    useSimulationStore.setState({
      params: params ?? { ...DEFAULT_SIM_PARAMS },
      isActive: active,
    });
    return () => {
      useSimulationStore.setState({
        params: { ...DEFAULT_SIM_PARAMS },
        isActive: false,
      });
    };
  }, [active, params]);
  return <>{children}</>;
}

export const Active: Story = {
  render: () => (
    <Wrapper
      active
      params={{ min_confidence: 0.65, max_fpr: 0.03, min_distance: 20 }}
    >
      <SimulatedRibbon />
    </Wrapper>
  ),
};

export const Inactive: Story = {
  render: () => (
    <Wrapper active={false}>
      <div>
        <SimulatedRibbon />
        <p className="px-4 py-3 font-mono text-xs text-ink-muted">
          (Ribbon is hidden — store is inactive.)
        </p>
      </div>
    </Wrapper>
  ),
};

export const AggressiveSim: Story = {
  render: () => (
    <Wrapper
      active
      params={{ min_confidence: 0.95, max_fpr: 0.005, min_distance: 80 }}
    >
      <SimulatedRibbon />
    </Wrapper>
  ),
};
