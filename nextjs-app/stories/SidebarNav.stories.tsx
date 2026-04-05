import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SidebarNav } from '../components/sidebar-nav';

const meta: Meta<typeof SidebarNav> = {
  title: 'Components/SidebarNav',
  component: SidebarNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'content' },
    docs: {
      description: {
        component:
          'Fixed-width (260px) left navigation. Three primary routes plus an AI ' +
          'Agent panel toggle at the bottom. Active state is driven by ' +
          '`usePathname()` — Storybook stories override this via the ' +
          '`nextjs.navigation.pathname` parameter.',
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="relative h-screen bg-surface-content">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const ChatToggleWrapper = ({ initialOpen = false }: { initialOpen?: boolean }) => {
  const [chatOpen, setChatOpen] = useState(initialOpen);
  return <SidebarNav chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} />;
};

export const DashboardActive: Story = {
  render: () => <ChatToggleWrapper />,
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
    docs: {
      description: {
        story: 'Default — Dashboard route is active, red accent bar visible on the left edge.',
      },
    },
  },
};

export const ResultsActive: Story = {
  render: () => <ChatToggleWrapper />,
  parameters: {
    nextjs: { navigation: { pathname: '/results' } },
    docs: {
      description: {
        story: 'Test Results route is active.',
      },
    },
  },
};

export const GeneratorActive: Story = {
  render: () => <ChatToggleWrapper />,
  parameters: {
    nextjs: { navigation: { pathname: '/test-generator' } },
    docs: {
      description: {
        story: 'Test Generator route is active.',
      },
    },
  },
};

export const ChatOpen: Story = {
  render: () => <ChatToggleWrapper initialOpen />,
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
    docs: {
      description: {
        story:
          'AI Agent toggle in the "open" state — the bottom pill glows green and pulses, ' +
          'and `aria-pressed` flips to `true`.',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => <ChatToggleWrapper />,
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
    docs: {
      description: {
        story: 'Click the AI Agent button at the bottom to toggle the state and watch the dot flip.',
      },
    },
  },
};
