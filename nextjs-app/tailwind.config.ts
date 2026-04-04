import type { Config } from 'tailwindcss';

/**
 * ADAS Test Agent — Design Tokens
 *
 * Hex values mirror the CSS custom properties in app/globals.css
 * (see CLAUDE.md:117-150). Using hex here lets Tailwind compute opacity
 * modifiers (`bg-agent-thinking/20`) automatically. The globals.css
 * variables remain the canonical source for hand-written CSS and
 * future theme switching.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — backgrounds
        surface: {
          dark: '#0F1117',      // --bg-primary: sidebar, dark chat panel
          elevated: '#1A1D27',  // --bg-secondary: cards on dark surface
          base: '#F8F9FB',      // --bg-content: main content area
          card: '#FFFFFF',      // --bg-card: cards on light surface
        },
        // Magna brand
        magna: {
          red: '#C4161C',           // --magna-red
          'red-hover': '#A01218',   // --magna-red-hover
        },
        // Test result status
        status: {
          pass: '#10B981',      // --status-pass (emerald)
          fail: '#EF4444',      // --status-fail
          warning: '#F59E0B',   // --status-warning (amber)
          info: '#3B82F6',      // --status-info
        },
        // Agent run states
        agent: {
          thinking: '#8B5CF6',  // --agent-thinking (purple)
          idle: '#6B7280',      // --agent-idle
          success: '#10B981',   // --agent-success
        },
        // Text
        ink: {
          primary: '#111827',   // --text-primary
          secondary: '#6B7280', // --text-secondary
          muted: '#9CA3AF',     // --text-muted
          'on-dark': '#F3F4F6', // --text-on-dark
        },
        // Borders
        hairline: {
          DEFAULT: '#E5E7EB',   // --border-default
          subtle: '#F3F4F6',    // --border-subtle
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-dm-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        panel: '-8px 0 24px rgba(0, 0, 0, 0.12)',
      },
      maxWidth: {
        content: '1440px',
      },
      width: {
        sidebar: '260px',
        chatpanel: '400px',
      },
      spacing: {
        sidebar: '260px',
        chatpanel: '400px',
        kpibar: '80px',
      },
    },
  },
  plugins: [],
};

export default config;
