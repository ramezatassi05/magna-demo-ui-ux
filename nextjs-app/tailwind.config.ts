import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * ADAS Test Agent — Design Tokens
 *
 * Hex values mirror the CSS custom properties in app/globals.css.
 * Using hex here lets Tailwind compute opacity modifiers
 * (`bg-agent-thinking/20`, `bg-state-critical/10`) automatically.
 * The globals.css variables remain the canonical source for
 * hand-written CSS and future theme switching.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — backgrounds
        surface: {
          dark: '#000000',      // --bg-primary: sidebar, dark chat panel (pure black per magna.com)
          elevated: '#111111',  // --bg-secondary: cards on dark surface
          base: '#F8F9FB',      // --bg-content: main content area
          card: '#FFFFFF',      // --bg-card: cards on light surface
        },
        // Magna brand — sourced from magna.com (Pantone 179 C)
        magna: {
          red: '#DA291C',           // --magna-red
          'red-hover': '#B51F23',   // --magna-red-hover
          gray: '#ACACAC',          // --magna-gray
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
        // State Rules — daylight-readable industrial alerts
        state: {
          critical: '#B00020',
          'critical-bg': '#FFF1F2',
          'critical-border': '#DC2626',
          anomaly: '#D97706',
          'anomaly-bg': '#FFFBEB',
          'anomaly-border': '#F59E0B',
          override: '#1D4ED8',
          'override-bg': '#EFF6FF',
          'override-border': '#3B82F6',
          nominal: '#047857',
        },
        // Confidence meter track
        meter: {
          track: '#E5E7EB',
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-inter)', "'Helvetica Neue'", "'Helvetica'", 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Engineering metadata strip — mono 10px uppercase-tracked
        code: ['10px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        // Global card radius: 2px (sharp corners per magna.com design language)
        card: '2px',
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
      transitionDuration: {
        instant: '80ms',
        quick: '160ms',
        standard: '240ms',
        emphasis: '360ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        magna: 'cubic-bezier(0.35, 0.495, 0.445, 1.005)',
        emphasis: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
