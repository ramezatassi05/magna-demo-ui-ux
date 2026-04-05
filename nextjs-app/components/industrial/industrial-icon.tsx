import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bookmark,
  CheckCircle2,
  Database,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Filter,
  GitBranch,
  HelpCircle,
  Inbox,
  ListTree,
  Radar,
  RotateCw,
  ShieldAlert,
  SlidersHorizontal,
  Square,
  UserCog,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * IndustrialIcon — single source of truth for iconography.
 *
 * All icons across Magna-pattern surfaces route through this wrapper
 * to enforce consistent stroke-width, size, and color tone. Enables
 * easy audit if we ever swap icon sets (e.g., to a custom Magna set).
 *
 * Semantic aliases map domain concepts ("Safety", "Override", "Why")
 * to lucide icons — consumers call `<IndustrialIcon name="Safety" />`
 * rather than picking lucide icons directly.
 */

const ICONS = {
  // Alerts & safety
  Safety: ShieldAlert,
  Warning: AlertTriangle,
  Critical: AlertCircle,
  // Maintenance & operations
  Maintenance: Wrench,
  Threshold: SlidersHorizontal,
  Filter: Filter,
  // Human-in-the-loop / control
  Override: UserCog,
  Stop: Square,
  Confirm: CheckCircle2,
  Reject: XCircle,
  Retry: RotateCw,
  // Explainability
  Why: HelpCircle,
  Reasoning: GitBranch,
  Trace: ListTree,
  // Navigation / storage
  Bookmark: Bookmark,
  Database: Database,
  Empty: Inbox,
  // Analytics
  Chart: BarChart3,
  Sensor: Radar,
  // Test generator / data
  TestCase: FileCode2,
  Csv: FileSpreadsheet,
  Json: FileJson,
} as const satisfies Record<string, LucideIcon>;

export type IndustrialIconName = keyof typeof ICONS;

export type IndustrialIconTone =
  | 'critical'
  | 'anomaly'
  | 'override'
  | 'nominal'
  | 'brand'
  | 'muted'
  | 'on-dark'
  | 'inherit';

export type IndustrialIconSize = 'xs' | 'sm' | 'md' | 'lg';

interface IndustrialIconProps {
  name: IndustrialIconName;
  size?: IndustrialIconSize;
  tone?: IndustrialIconTone;
  className?: string;
  /** When decorative (default), icon is aria-hidden. */
  decorative?: boolean;
  /** Required when decorative=false. */
  'aria-label'?: string;
}

const SIZE_PX: Record<IndustrialIconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};

const TONE_CLASS: Record<IndustrialIconTone, string> = {
  critical: 'text-state-critical',
  anomaly: 'text-state-anomaly',
  override: 'text-state-override',
  nominal: 'text-state-nominal',
  brand: 'text-magna-red',
  muted: 'text-ink-muted',
  'on-dark': 'text-ink-on-dark',
  inherit: '',
};

/** Semantic icon — pulls from the canonical ICONS map. */
export function IndustrialIcon({
  name,
  size = 'md',
  tone = 'inherit',
  className,
  decorative = true,
  'aria-label': ariaLabel,
}: IndustrialIconProps) {
  const Icon = ICONS[name];
  const px = SIZE_PX[size];

  return (
    <Icon
      width={px}
      height={px}
      strokeWidth={2}
      className={cn('shrink-0', TONE_CLASS[tone], className)}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : ariaLabel}
      role={decorative ? undefined : 'img'}
    />
  );
}
