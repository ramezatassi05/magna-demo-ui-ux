import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useState } from 'react';

import { ParameterSliderPanel } from '../../components/industrial/parameter-slider-panel';
import { DEFAULT_SIM_PARAMS } from '../../lib/simulations';
import { useSimulationStore } from '../../lib/stores/simulation-store';

const meta: Meta<typeof ParameterSliderPanel> = {
  title: 'Industrial/ParameterSliderPanel',
  component: ParameterSliderPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Collapsible "what-if" panel with three threshold sliders wired ' +
          'to the simulation store. Dragging any slider auto-activates ' +
          'simulation mode; Reset restores defaults and deactivates. Panel ' +
          'uses rAF-throttled local state so the UI stays 60fps while ' +
          'downstream KPI recomputes run once per frame.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function PanelWrapper(args: { initiallyOpen: boolean; preset?: 'default' | 'dirty' }) {
  const [open, setOpen] = useState(args.initiallyOpen);

  useEffect(() => {
    if (args.preset === 'dirty') {
      useSimulationStore.setState({
        params: { min_confidence: 0.65, max_fpr: 0.03, min_distance: 20 },
        isActive: true,
      });
    } else {
      useSimulationStore.setState({
        params: { ...DEFAULT_SIM_PARAMS },
        isActive: false,
      });
    }
    return () => {
      useSimulationStore.setState({
        params: { ...DEFAULT_SIM_PARAMS },
        isActive: false,
      });
    };
  }, [args.preset]);

  return (
    <div className="w-[480px]">
      <ParameterSliderPanel open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const Closed: Story = {
  render: () => <PanelWrapper initiallyOpen={false} preset="default" />,
};

export const Open: Story = {
  render: () => <PanelWrapper initiallyOpen={true} preset="default" />,
};

export const WithDirtyValues: Story = {
  render: () => <PanelWrapper initiallyOpen={true} preset="dirty" />,
  parameters: {
    docs: {
      description: {
        story:
          'When any param differs from the default, the Active badge appears ' +
          'in the header and the value readouts render in override color.',
      },
    },
  },
};
