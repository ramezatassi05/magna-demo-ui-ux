import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ManualOverrideControl } from '../../components/industrial/manual-override-control';

const meta: Meta<typeof ManualOverrideControl> = {
  title: 'Industrial/ManualOverrideControl',
  component: ManualOverrideControl,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component:
          'Agent takeover strip for the chat panel footer. Stop-agent ' +
          'requires AlertDialog confirmation; Scope injects a filter prefix ' +
          'into the next user message; Override-recommendation lets the ' +
          'operator reject the last agent suggestion. All events announce ' +
          'via an aria-live region for screen readers.',
      },
    },
  },
  argTypes: {
    status: { control: 'radio', options: ['idle', 'streaming', 'error'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[400px] bg-surface-elevated">{children}</div>
);

export const Idle: Story = {
  render: () => (
    <Wrapper>
      <ManualOverrideControl
        status="idle"
        onStop={() => console.log('stop')}
        onInjectFilter={(f) => console.log('inject', f)}
      />
    </Wrapper>
  ),
};

export const Streaming: Story = {
  render: () => (
    <Wrapper>
      <ManualOverrideControl
        status="streaming"
        onStop={() => console.log('stop')}
        onInjectFilter={(f) => console.log('inject', f)}
      />
    </Wrapper>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Stop button is visible only during streaming. Clicking it opens ' +
          'an AlertDialog to confirm before aborting the run.',
      },
    },
  },
};

export const WithLastRecommendation: Story = {
  render: () => (
    <Wrapper>
      <ManualOverrideControl
        status="idle"
        onStop={() => console.log('stop')}
        onInjectFilter={(f) => console.log('inject', f)}
        onOverrideRecommendation={() => console.log('override')}
        lastRecommendation={{
          id: 'rec-1',
          summary:
            'Recommend re-running thermal AEB suite with elevated confidence floor (0.75) to filter out low-signal detections.',
        }}
      />
    </Wrapper>
  ),
};

export const StreamingWithRecommendation: Story = {
  render: () => (
    <Wrapper>
      <ManualOverrideControl
        status="streaming"
        onStop={() => console.log('stop')}
        onInjectFilter={(f) => console.log('inject', f)}
        onOverrideRecommendation={() => console.log('override')}
        lastRecommendation={{
          id: 'rec-2',
          summary: 'Agent suggests escalating to L2 review.',
        }}
      />
    </Wrapper>
  ),
};
