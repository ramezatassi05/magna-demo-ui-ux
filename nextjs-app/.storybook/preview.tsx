import React from 'react';
import type { Preview } from '@storybook/nextjs-vite';

import '../app/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'content',
      values: [
        { name: 'content', value: '#F8F9FB' },
        { name: 'card', value: '#FFFFFF' },
        { name: 'dark', value: '#0F1117' },
        { name: 'elevated', value: '#1A1D27' },
      ],
    },
    docs: {
      toc: true,
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      config: {
        rules: [
          // Recharts generates its own SVG structure; skip color-contrast on
          // tooltip paths which can false-positive in story screenshots.
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        className="font-sans text-ink-primary"
        style={{
          // Fonts are wired to CSS variables in app/layout.tsx. In Storybook we
          // fall back to the next-best system fonts so content is still
          // legible without pulling next/font into the preview bundle.
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <style>{`
          :root {
            --font-dm-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', Roboto, sans-serif;
            --font-jetbrains-mono: ui-monospace, SFMono-Regular, 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
          }
        `}</style>
        <Story />
      </div>
    ),
  ],
};

export default preview;
